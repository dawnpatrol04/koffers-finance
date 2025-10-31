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
                  plaidAccountId: account.account_id,
                  isActive: true,
                  color: '#4285f4' // Default color
                }
              );
              results.accountsAdded++;
            }
          } catch (error: any) {
            console.error(`Error storing account ${account.account_id}:`, error.message);
            results.errors.push(`Account ${account.account_id}: ${error.message}`);
          }
        }

        // Fetch transactions (24 months)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 24);

        const transactionsResponse = await plaidClient.transactionsGet({
          access_token: accessToken,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          options: {
            count: 500, // Max per request
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

        console.log(`💰 Fetched ${allTransactions.length} transactions for item ${item.itemId}`);

        // Store transactions with duplicate detection and progress tracking
        const totalTransactions = allTransactions.length;
        let processedCount = 0;

        for (const transaction of allTransactions) {
          processedCount++;

          // Log progress every 50 transactions
          if (processedCount % 50 === 0 || processedCount === totalTransactions) {
            console.log(`📊 Progress: ${processedCount}/${totalTransactions} transactions processed (${Math.round(processedCount/totalTransactions*100)}%)`);
          }
          try {
            // Check if transaction already exists in staging area
            const existingTransaction = await databases.listDocuments(
              DATABASE_ID,
              COLLECTIONS.PLAID_TRANSACTIONS,
              [
                Query.equal('plaidTransactionId', transaction.transaction_id),
                Query.limit(1)
              ]
            );

            if (existingTransaction.documents.length > 0) {
              // Transaction already exists, update rawData
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
              // New transaction - store in staging area (plaidTransactions)
              await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.PLAID_TRANSACTIONS,
                ID.unique(),
                {
                  userId,
                  plaidItemId: item.$id, // Link to plaidItems record
                  plaidAccountId: transaction.account_id,
                  plaidTransactionId: transaction.transaction_id,
                  transactionId: null, // Will be set after processing
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
