require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function checkTransactions() {
  console.log('Checking transactions collection...\n');

  const transactions = await databases.listDocuments(DATABASE_ID, 'transactions');
  console.log(`transactions collection: ${transactions.total} documents`);

  const plaidTransactions = await databases.listDocuments(DATABASE_ID, 'plaidTransactions');
  console.log(`plaidTransactions collection: ${plaidTransactions.total} documents`);

  if (plaidTransactions.total > 0) {
    console.log('\nSample plaidTransaction (raw data):');
    const sample = plaidTransactions.documents[0];
    const rawData = JSON.parse(sample.rawData);
    console.log('  Raw data fields:', Object.keys(rawData).slice(0, 10).join(', '));
    console.log(`  Name: ${rawData.name}`);
    console.log(`  Amount: ${rawData.amount}`);
    console.log(`  Date: ${rawData.date}`);
  }
}

checkTransactions();
