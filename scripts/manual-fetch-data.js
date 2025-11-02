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

async function manualFetch() {
  console.log('🚀 Manually triggering fetch-data logic...\n');

  try {
    const userId = '68feda5ccfd38390a7d7';

    // Get Plaid items
    const items = await databases.listDocuments(DATABASE_ID, 'plaidItems', [
      sdk.Query.equal('userId', userId)
    ]);

    console.log(`Found ${items.total} plaid items\n`);

    for (const item of items.documents) {
      console.log(`Processing item: ${item.institutionName} (${item.itemId})`);
      const accessToken = item.accessToken;

      // Fetch accounts
      console.log('  Fetching accounts...');
      const accountsResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      console.log(`  ✅ Got ${accountsResponse.data.accounts.length} accounts`);
      accountsResponse.data.accounts.forEach(acc => {
        console.log(`     - ${acc.name} (${acc.mask}): $${acc.balances.current}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

manualFetch();
