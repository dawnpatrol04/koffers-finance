require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

// Setup Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments.production,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(configuration);

async function fullFetchData() {
  console.log('🚀 Running FULL fetch-data logic...\n');

  try {
    const userId = '68feda5ccfd38390a7d7';

    // Get Plaid items
    const items = await databases.listDocuments(DATABASE_ID, 'plaidItems', [
      sdk.Query.equal('userId', userId)
    ]);

    console.log(`Found ${items.total} plaid items\n`);

    for (const item of items.documents) {
      console.log(`\n📦 Processing item: ${item.institutionName} (${item.itemId})`);
      const accessToken = item.accessToken;

      // Fetch and store accounts
      console.log('  Fetching accounts...');
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      console.log(`  ✅ Got ${accountsResponse.data.accounts.length} accounts`);

      for (const account of accountsResponse.data.accounts) {
        console.log(`     Processing: ${account.name} (${account.mask})`);

        // Check if exists
        const existing = await databases.listDocuments(
          DATABASE_ID,
          'accounts',
          [sdk.Query.equal('plaidAccountId', account.account_id), sdk.Query.limit(1)]
        );

        if (existing.documents.length === 0) {
          await databases.createDocument(
            DATABASE_ID,
            'accounts',
            sdk.ID.unique(),
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
          console.log(`        ✅ Created account in database`);
        } else {
          console.log(`        ⏭️  Account already exists`);
        }
      }

      // Fetch transactions
      console.log('\n  Fetching transactions (24 months)...');
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 24);

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
      console.log(`  ✅ Got ${allTransactions.length} transactions`);

      console.log('  Storing transactions...');
      let stored = 0;
      let skipped = 0;

      for (const transaction of allTransactions) {
        const existing = await databases.listDocuments(
          DATABASE_ID,
          'plaidTransactions',
          [sdk.Query.equal('plaidTransactionId', transaction.transaction_id), sdk.Query.limit(1)]
        );

        if (existing.documents.length === 0) {
          await databases.createDocument(
            DATABASE_ID,
            'plaidTransactions',
            sdk.ID.unique(),
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
          stored++;
        } else {
          skipped++;
        }

        if ((stored + skipped) % 20 === 0) {
          console.log(`     Progress: ${stored + skipped}/${allTransactions.length}`);
        }
      }

      console.log(`  ✅ Stored ${stored} new transactions, skipped ${skipped} existing\n`);
    }

    console.log('\n✅ COMPLETE!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

fullFetchData();
