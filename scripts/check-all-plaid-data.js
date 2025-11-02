require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function checkAllData() {
  console.log('🔍 Checking ALL Plaid-related data...\n');

  try {
    // Check plaidItems
    const items = await databases.listDocuments(DATABASE_ID, 'plaidItems');
    console.log(`✅ plaidItems: ${items.total} documents`);
    items.documents.forEach(item => {
      console.log(`   - ${item.institutionName} (${item.itemId})`);
      const token = item.accessToken || 'MISSING';
      console.log(`     Access Token: ${token.substring(0, 20)}...`);
      console.log(`     Created: ${item.$createdAt}\n`);
    });

    // Check accounts
    const accounts = await databases.listDocuments(DATABASE_ID, 'accounts');
    console.log(`\n✅ accounts: ${accounts.total} documents`);
    accounts.documents.forEach(acc => {
      console.log(`   - ${acc.name || 'Unnamed'} (${acc.accountId})`);
      console.log(`     Balance: $${acc.currentBalance || 0}`);
      console.log(`     Type: ${acc.type} / ${acc.subtype}`);
      console.log(`     User ID: ${acc.userId}\n`);
    });

    // Check plaidTransactions
    const transactions = await databases.listDocuments(DATABASE_ID, 'plaidTransactions');
    console.log(`\n✅ plaidTransactions: ${transactions.total} documents`);
    if (transactions.total > 0) {
      console.log(`   Showing first 5:`);
      transactions.documents.slice(0, 5).forEach(txn => {
        console.log(`   - ${txn.name}: $${txn.amount} on ${txn.date}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAllData();
