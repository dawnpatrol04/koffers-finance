require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function checkFields() {
  const accounts = await databases.listDocuments(DATABASE_ID, 'accounts');
  if (accounts.total > 0) {
    console.log('First account document:');
    console.log(JSON.stringify(accounts.documents[0], null, 2));
  }
}

checkFields();
