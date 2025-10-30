import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

// Disable body parsing to get raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('🔔 Received Plaid webhook:', {
      type: body.webhook_type,
      code: body.webhook_code,
      itemId: body.item_id
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

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Error processing Plaid webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
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

    // Store/update transactions
    for (const transaction of allTransactions) {
      try {
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

        if (existingTransaction.documents.length > 0) {
          // Update existing transaction
          await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            existingTransaction.documents[0].$id,
            {
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
            }
          );
          updated++;
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
            }
          );
          added++;
        }
      } catch (error: any) {
        console.error(`Error storing transaction ${transaction.transaction_id}:`, error.message);
      }
    }

    console.log(`✅ Webhook sync complete: ${added} added, ${updated} updated`);

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
