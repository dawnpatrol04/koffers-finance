import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

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

    const results = {
      accountsAdded: 0,
      transactionsAdded: 0,
      transactionsUpdated: 0,
      errors: [] as string[]
    };

    // Fetch data for each item
    for (const item of itemsResponse.documents) {
      try {
        const accessToken = item.accessToken;

        // Fetch accounts
        const accountsResponse = await plaidClient.accountsGet({
          access_token: accessToken,
        });

        console.log(`📦 Fetched ${accountsResponse.data.accounts.length} accounts for item ${item.itemId}`);

        // Store accounts in the new 'accounts' collection
        for (const account of accountsResponse.data.accounts) {
          try {
            // Check if account already exists
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
            }
          } catch (error: any) {
            console.error(`Error storing account ${account.account_id}:`, error.message);
            results.errors.push(`Account ${account.account_id}: ${error.message}`);
          }
        }

        // Fetch transactions using /transactions/sync (24 months)
        // Use cursor-based pagination for better reliability
        let allTransactions: any[] = [];
        let cursor: string | undefined = undefined;
        let hasMore = true;
        let pageCount = 0;

        console.log(`🔄 Starting transactions/sync for item ${item.itemId} with 730 days history...`);

        while (hasMore) {
          pageCount++;

          const syncResponse = await plaidClient.transactionsSync({
            access_token: accessToken,
            cursor: cursor,
            options: {
              count: 500, // Max per request
              include_personal_finance_category: true,
            },
          });

          // Add new transactions
          const addedTransactions = syncResponse.data.added || [];
          const modifiedTransactions = syncResponse.data.modified || [];

          allTransactions = [...allTransactions, ...addedTransactions, ...modifiedTransactions];

          console.log(`📄 Page ${pageCount}: +${addedTransactions.length} added, +${modifiedTransactions.length} modified (total: ${allTransactions.length})`);

          // Update cursor and check if more data available
          cursor = syncResponse.data.next_cursor;
          hasMore = syncResponse.data.has_more;

          // Safety check to prevent infinite loops
          if (pageCount > 100) {
            console.warn(`⚠️ Reached maximum page limit (100) for item ${item.itemId}`);
            break;
          }
        }

        console.log(`💰 Fetched ${allTransactions.length} transactions for item ${item.itemId} in ${pageCount} pages`);

        // Store transactions in batches to improve performance
        // Group transactions into batches and use Promise.all for parallel processing
        const totalTransactions = allTransactions.length;
        const BATCH_SIZE = 10; // Process 10 at a time
        let processedCount = 0;

        console.log(`💾 Starting to store ${totalTransactions} transactions in batches of ${BATCH_SIZE}...`);

        for (let i = 0; i < allTransactions.length; i += BATCH_SIZE) {
          const batch = allTransactions.slice(i, i + BATCH_SIZE);

          // Process batch in parallel
          await Promise.all(batch.map(async (transaction) => {
            try {
              // Check if transaction already exists
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
                  {
                    rawData: JSON.stringify(transaction)
                  }
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
              console.error(`Error storing transaction ${transaction.transaction_id}:`, error.message);
              results.errors.push(`Transaction ${transaction.transaction_id}: ${error.message}`);
            }
          }));

          processedCount += batch.length;
          const progress = Math.round((processedCount / totalTransactions) * 100);
          console.log(`📊 Progress: ${processedCount}/${totalTransactions} (${progress}%) - Added: ${results.transactionsAdded}, Updated: ${results.transactionsUpdated}, Errors: ${results.errors.length}`);
        }

      } catch (error: any) {
        console.error(`Error processing item ${item.itemId}:`, error);
        results.errors.push(`Item ${item.itemId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    });

  } catch (error: any) {
    console.error('Error fetching Plaid data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Plaid data' },
      { status: 500 }
    );
  }
}
