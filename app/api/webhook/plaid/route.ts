import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite-config';
import { databases } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import { jwtVerify, importJWK, decodeJwt, JWK } from 'jose';
import { createHash } from 'crypto';

// Disable body parsing to get raw body for signature verification
export const runtime = 'nodejs';

// Cache for webhook verification keys (keyed by kid)
const cachedKeys = new Map<string, Awaited<ReturnType<typeof importJWK>>>();

// Cache for processed webhook events (for idempotency)
// Store webhook_id with timestamp, auto-expire after 24 hours
const processedWebhooks = new Map<string, number>();
const WEBHOOK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old webhook entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [webhookId, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > WEBHOOK_CACHE_TTL) {
      processedWebhooks.delete(webhookId);
    }
  }
}, 60 * 60 * 1000); // Clean every hour

async function verifyWebhookSignature(request: NextRequest, body: any): Promise<boolean> {
  try {
    // Extract JWT from Plaid-Verification header
    const signedJwt = request.headers.get('plaid-verification');

    if (!signedJwt) {
      console.error('❌ No Plaid-Verification header found');
      return false;
    }

    // Decode JWT to extract kid (key ID) from header
    const decoded = decodeJwt(signedJwt);
    const header = JSON.parse(Buffer.from(signedJwt.split('.')[0], 'base64').toString());
    const kid = header.kid;

    if (!kid) {
      console.error('❌ No kid found in JWT header');
      return false;
    }

    // Get webhook verification key if not cached
    let publicKey = cachedKeys.get(kid);
    if (!publicKey) {
      const keyResponse = await plaidClient.webhookVerificationKeyGet({
        key_id: kid
      });

      if (!keyResponse.data.key) {
        console.error('❌ Failed to get webhook verification key');
        return false;
      }

      // Import JWK as crypto key
      const jwk = keyResponse.data.key as unknown as JWK;
      publicKey = await importJWK(jwk, 'ES256');
      cachedKeys.set(kid, publicKey);
      console.log(`✅ Cached webhook verification key: ${kid}`);
    }

    // Verify JWT signature
    const { payload } = await jwtVerify(signedJwt, publicKey, {
      algorithms: ['ES256']
    });

    // Compute SHA-256 hash of request body
    // Note: Plaid uses 2-space indentation, so we stringify with 2 spaces
    const bodyString = JSON.stringify(body, null, 2);
    const bodyHash = createHash('sha256').update(bodyString).digest('hex');

    // Verify hash matches
    if (payload.request_body_sha256 !== bodyHash) {
      console.error('❌ Request body hash mismatch');
      console.error(`Expected: ${payload.request_body_sha256}`);
      console.error(`Got: ${bodyHash}`);
      return false;
    }

    console.log('✅ Webhook signature verified');
    return true;

  } catch (error: any) {
    console.error('❌ Error verifying webhook signature:', error.message);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(request, body);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Check for duplicate webhook (idempotency)
    const webhookId = body.webhook_id;
    if (webhookId && processedWebhooks.has(webhookId)) {
      console.log(`✅ Webhook ${webhookId} already processed, skipping (idempotent)`);
      return NextResponse.json({
        success: true,
        message: 'Webhook already processed'
      });
    }

    console.log('🔔 Received Plaid webhook:', {
      type: body.webhook_type,
      code: body.webhook_code,
      itemId: body.item_id,
      webhookId: webhookId
    });

    // Get the webhook type and code
    const webhookType = body.webhook_type;
    const webhookCode = body.webhook_code;
    const itemId = body.item_id;

    // Find the user associated with this item
    const itemsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLAID_ITEMS,
      [Query.equal('itemId', itemId), Query.limit(1)]
    );

    if (itemsResponse.documents.length === 0) {
      console.error(`❌ No item found for itemId: ${itemId}`);
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = itemsResponse.documents[0];
    const userId = item.userId;
    const accessToken = item.accessToken;

    // Handle different webhook types
    switch (webhookType) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(webhookCode, userId, accessToken, body);
        break;

      case 'ITEM':
        await handleItemWebhook(webhookCode, userId, itemId, body);
        break;

      default:
        console.log(`⚠️ Unhandled webhook type: ${webhookType}`);
    }

    // Mark webhook as processed (idempotency)
    if (webhookId) {
      processedWebhooks.set(webhookId, Date.now());
      console.log(`✅ Marked webhook ${webhookId} as processed`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error processing Plaid webhook:', error);

    // Return 500 for server errors (Plaid will retry)
    // Return 200 for non-retryable errors (invalid data, etc.)
    const isRetryable = !error.message?.includes('not found') &&
                       !error.message?.includes('invalid');

    if (isRetryable) {
      // Server error - Plaid will retry
      return NextResponse.json(
        { error: error.message || 'Failed to process webhook' },
        { status: 500 }
      );
    } else {
      // Non-retryable error - return 200 to prevent retries
      console.log('⚠️ Non-retryable error, returning 200 to prevent retries');
      return NextResponse.json({
        success: false,
        error: error.message || 'Non-retryable error'
      });
    }
  }
}

async function handleTransactionsWebhook(
  code: string,
  userId: string,
  accessToken: string,
  body: any
) {
  console.log(`📊 Handling TRANSACTIONS webhook: ${code}`);

  switch (code) {
    case 'INITIAL_UPDATE':
    case 'HISTORICAL_UPDATE':
    case 'DEFAULT_UPDATE':
      // Fetch new transactions
      await syncTransactions(userId, accessToken, body);
      break;

    case 'TRANSACTIONS_REMOVED':
      // Remove transactions that no longer exist
      await removeTransactions(body.removed_transactions);
      break;

    default:
      console.log(`⚠️ Unhandled TRANSACTIONS webhook code: ${code}`);
  }
}

async function handleItemWebhook(
  code: string,
  userId: string,
  itemId: string,
  body: any
) {
  console.log(`🔧 Handling ITEM webhook: ${code}`);

  switch (code) {
    case 'ERROR':
      console.error(`❌ Item error for ${itemId}:`, body.error);
      // TODO: Mark item as having an error in database
      // Could store error state in plaid_items collection
      break;

    case 'PENDING_EXPIRATION':
      console.warn(`⚠️ Item ${itemId} requires re-authentication`);
      // TODO: Notify user to re-link their bank account
      break;

    case 'USER_PERMISSION_REVOKED':
      console.warn(`⚠️ User revoked permissions for ${itemId}`);
      // TODO: Mark item as inactive
      break;

    default:
      console.log(`⚠️ Unhandled ITEM webhook code: ${code}`);
  }
}

async function syncTransactions(
  userId: string,
  accessToken: string,
  webhookBody: any
) {
  try {
    // Get the date range from webhook (if provided)
    // For DEFAULT_UPDATE, we only need recent transactions (last 30 days)
    const endDate = new Date();
    const startDate = new Date();

    if (webhookBody.webhook_code === 'DEFAULT_UPDATE') {
      // Only fetch last 30 days for incremental updates
      startDate.setDate(startDate.getDate() - 30);
    } else {
      // For INITIAL_UPDATE and HISTORICAL_UPDATE, fetch full history
      startDate.setMonth(startDate.getMonth() - 24);
    }

    console.log(`📅 Syncing transactions from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Fetch transactions with pagination
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      options: {
        count: 500,
        offset: 0,
      }
    });

    let allTransactions = transactionsResponse.data.transactions;
    let hasMore = allTransactions.length < transactionsResponse.data.total_transactions;
    let offset = 500;

    // Paginate to get all transactions
    while (hasMore) {
      const moreTransactions = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        options: {
          count: 500,
          offset: offset,
        }
      });

      allTransactions = [...allTransactions, ...moreTransactions.data.transactions];
      offset += 500;
      hasMore = allTransactions.length < transactionsResponse.data.total_transactions;
    }

    console.log(`💰 Fetched ${allTransactions.length} transactions via webhook`);

    let added = 0;
    let updated = 0;
    let errors = 0;

    // Process transactions in batches to handle errors better
    const BATCH_SIZE = 50;
    for (let i = 0; i < allTransactions.length; i += BATCH_SIZE) {
      const batch = allTransactions.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allTransactions.length / BATCH_SIZE)} (${batch.length} transactions)`);

      // Process batch with Promise.allSettled to handle failures gracefully
      const results = await Promise.allSettled(
        batch.map(async (transaction) => {
          // Check if transaction already exists
          const existingTransaction = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            [
              Query.equal('userId', userId),
              Query.equal('transactionId', transaction.transaction_id),
              Query.limit(1)
            ]
          );

          const transactionData = {
            date: transaction.date,
            name: transaction.name,
            merchantName: transaction.merchant_name || transaction.name,
            amount: transaction.amount,
            isoCurrencyCode: transaction.iso_currency_code || 'USD',
            pending: transaction.pending || false,
            category: JSON.stringify(transaction.category || []),
            categoryId: transaction.category_id || '',
            paymentChannel: transaction.payment_channel,
            rawData: JSON.stringify(transaction)
          };

          if (existingTransaction.documents.length > 0) {
            // Update existing transaction
            await databases.updateDocument(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              existingTransaction.documents[0].$id,
              transactionData
            );
            return { action: 'updated', transactionId: transaction.transaction_id };
          } else {
            // Create new transaction
            await databases.createDocument(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              ID.unique(),
              {
                userId,
                accountId: transaction.account_id,
                transactionId: transaction.transaction_id,
                ...transactionData
              }
            );
            return { action: 'added', transactionId: transaction.transaction_id };
          }
        })
      );

      // Count successes and failures
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          if (result.value.action === 'added') {
            added++;
          } else {
            updated++;
          }
        } else {
          errors++;
          const transaction = batch[index];
          console.error(`❌ Error processing transaction ${transaction.transaction_id}:`, result.reason?.message);
        }
      });
    }

    console.log(`✅ Webhook sync complete: ${added} added, ${updated} updated, ${errors} errors`);

    // Auto-categorize new transactions in background
    if (added > 0) {
      // Get IDs of newly added transactions (those without aiCategorized flag)
      // Note: We'll just categorize recent transactions since Appwrite doesn't easily query for null fields
      const recentTransactions = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAID_TRANSACTIONS,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt'),
          Query.limit(added) // Just categorize the transactions we just added
        ]
      );

      // Filter to only uncategorized ones
      const uncategorizedTransactions = recentTransactions.documents.filter(
        doc => !doc.aiCategorized
      );

      if (uncategorizedTransactions.length > 0) {
        const transactionIds = uncategorizedTransactions.map(doc => doc.$id);

        console.log(`🤖 Triggering AI categorization for ${transactionIds.length} transactions`);

        // Call categorization API asynchronously (fire and forget)
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/categorize-transaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionIds })
        }).catch(error => {
          console.error('Error triggering auto-categorization:', error);
        });
      }
    }

  } catch (error: any) {
    console.error('❌ Error syncing transactions from webhook:', error);
    throw error;
  }
}

async function removeTransactions(removedTransactionIds: string[]) {
  try {
    console.log(`🗑️ Removing ${removedTransactionIds.length} transactions`);

    for (const transactionId of removedTransactionIds) {
      try {
        const existingTransaction = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PLAID_TRANSACTIONS,
          [Query.equal('transactionId', transactionId), Query.limit(1)]
        );

        if (existingTransaction.documents.length > 0) {
          await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            existingTransaction.documents[0].$id
          );
          console.log(`✅ Removed transaction ${transactionId}`);
        }
      } catch (error: any) {
        console.error(`Error removing transaction ${transactionId}:`, error.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Error removing transactions:', error);
    throw error;
  }
}
