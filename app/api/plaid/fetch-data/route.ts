import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import { TransactionsSyncRequest } from 'plaid';

/**
 * Fetch and sync transaction data from Plaid
 * Based on official Plaid Node.js documentation
 * https://plaid.com/docs/transactions/add-to-app
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`🔵 Starting Plaid sync for user: ${userId}`);

    // Get all Plaid items for this user
    const itemsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLAID_ITEMS,
      [Query.equal('userId', userId)]
    );

    if (itemsResponse.documents.length === 0) {
      return NextResponse.json(
        { error: 'No Plaid items found for user' },
        { status: 404 }
      );
    }

    console.log(`📦 Found ${itemsResponse.documents.length} Plaid items`);

    const results = {
      accountsAdded: 0,
      transactionsAdded: 0,
      transactionsUpdated: 0,
      errors: [] as string[]
    };

    // Process each Plaid item
    for (const item of itemsResponse.documents) {
      try {
        const accessToken = item.accessToken;
        const itemId = item.itemId;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Processing Item: ${itemId}`);
        console.log(`Institution: ${item.institutionName || 'Unknown'}`);
        console.log(`${'='.repeat(60)}`);

        // Fetch accounts first
        try {
          const accountsResponse = await plaidClient.accountsGet({
            access_token: accessToken,
          });

          console.log(`✅ Fetched ${accountsResponse.data.accounts.length} accounts`);

          // Store/update accounts
          for (const account of accountsResponse.data.accounts) {
            try {
              const existingAccount = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.ACCOUNTS,
                [
                  Query.equal('plaidAccountId', account.account_id),
                  Query.limit(1)
                ]
              );

              if (existingAccount.documents.length === 0) {
                await databases.createDocument(
                  DATABASE_ID,
                  COLLECTIONS.ACCOUNTS,
                  ID.unique(),
                  {
                    userId,
                    name: account.official_name || account.name,
                    type: account.type === 'depository' ? (account.subtype === 'checking' ? 'checking' : 'savings') :
                          account.type === 'credit' ? 'credit' : 'investment',
                    institution: item.institutionName || '',
                    lastFour: account.mask || '',
                    currentBalance: account.balances.current || 0,
                    plaidItemId: item.itemId,
                    plaidAccountId: account.account_id
                  }
                );
                results.accountsAdded++;
                console.log(`  ✅ Added account: ${account.name}`);
              }
            } catch (error: any) {
              console.error(`  ❌ Error storing account: ${error.message}`);
              results.errors.push(`Account ${account.account_id}: ${error.message}`);
            }
          }
        } catch (error: any) {
          console.error(`❌ Error fetching accounts: ${error.message}`);
          results.errors.push(`Accounts for ${itemId}: ${error.message}`);
        }

        // Fetch transactions using /transactions/sync
        // Implementation based on official docs
        console.log(`\n🔄 Syncing transactions for item ${itemId}...`);

        let cursor: string | undefined = undefined;
        let added: any[] = [];
        let modified: any[] = [];
        let hasMore = true;
        let pageCount = 0;

        // Paginate through all transaction updates
        while (hasMore) {
          pageCount++;

          const syncRequest: TransactionsSyncRequest = {
            access_token: accessToken,
            cursor: cursor,
            options: {
              include_personal_finance_category: true,
            },
          };

          try {
            const response = await plaidClient.transactionsSync(syncRequest);
            const data = response.data;

            // Accumulate results
            added = added.concat(data.added || []);
            modified = modified.concat(data.modified || []);

            console.log(`  📄 Page ${pageCount}: +${data.added?.length || 0} added, +${data.modified?.length || 0} modified (total: ${added.length + modified.length})`);

            hasMore = data.has_more;
            cursor = data.next_cursor;

            // Safety limit
            if (pageCount > 100) {
              console.warn(`  ⚠️ Reached page limit (100)`);
              break;
            }
          } catch (error: any) {
            console.error(`  ❌ Error on page ${pageCount}:`, error.response?.data || error.message);
            results.errors.push(`Transactions sync page ${pageCount}: ${error.response?.data?.error_message || error.message}`);
            break;
          }
        }

        const allTransactions = [...added, ...modified];
        console.log(`\n💰 Total transactions fetched: ${allTransactions.length}`);

        if (allTransactions.length === 0) {
          console.log(`  ℹ️ No transactions to process`);
          continue;
        }

        // Store transactions in batches
        const BATCH_SIZE = 10;
        let processedCount = 0;

        console.log(`💾 Storing ${allTransactions.length} transactions in batches of ${BATCH_SIZE}...`);

        for (let i = 0; i < allTransactions.length; i += BATCH_SIZE) {
          const batch = allTransactions.slice(i, i + BATCH_SIZE);

          await Promise.all(batch.map(async (transaction) => {
            try {
              const existingTransaction = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.PLAID_TRANSACTIONS,
                [
                  Query.equal('plaidTransactionId', transaction.transaction_id),
                  Query.limit(1)
                ]
              );

              if (existingTransaction.documents.length > 0) {
                // Update existing
                await databases.updateDocument(
                  DATABASE_ID,
                  COLLECTIONS.PLAID_TRANSACTIONS,
                  existingTransaction.documents[0].$id,
                  { rawData: JSON.stringify(transaction) }
                );
                results.transactionsUpdated++;
              } else {
                // Create new
                await databases.createDocument(
                  DATABASE_ID,
                  COLLECTIONS.PLAID_TRANSACTIONS,
                  ID.unique(),
                  {
                    userId,
                    plaidItemId: item.$id,
                    plaidAccountId: transaction.account_id,
                    plaidTransactionId: transaction.transaction_id,
                    transactionId: null,
                    rawData: JSON.stringify(transaction),
                    processed: false
                  }
                );
                results.transactionsAdded++;
              }
            } catch (error: any) {
              console.error(`  ❌ Error storing transaction: ${error.message}`);
              results.errors.push(`Transaction ${transaction.transaction_id}: ${error.message}`);
            }
          }));

          processedCount += batch.length;
          const progress = Math.round((processedCount / allTransactions.length) * 100);
          console.log(`  📊 Progress: ${processedCount}/${allTransactions.length} (${progress}%)`);
        }

        console.log(`\n✅ Completed processing item ${itemId}`);

      } catch (error: any) {
        console.error(`\n❌ Error processing item ${item.itemId}:`, error.response?.data || error.message);
        results.errors.push(`Item ${item.itemId}: ${error.response?.data?.error_message || error.message}`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`FINAL RESULTS:`);
    console.log(`  Accounts added: ${results.accountsAdded}`);
    console.log(`  Transactions added: ${results.transactionsAdded}`);
    console.log(`  Transactions updated: ${results.transactionsUpdated}`);
    console.log(`  Errors: ${results.errors.length}`);
    console.log(`${'='.repeat(60)}`);

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('❌ Fatal error fetching Plaid data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Plaid data' },
      { status: 500 }
    );
  }
}
