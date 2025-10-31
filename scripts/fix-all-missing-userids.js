/**
 * Emergency Fix: Add userId to all collections that need it
 */

require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = 'koffers_poc';

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

async function addUserIdToCollection(collectionId, collectionName) {
  try {
    await databases.createStringAttribute(DATABASE_ID, collectionId, 'userId', 36, true);
    console.log(`✅ Added userId to ${collectionName}`);
  } catch (error) {
    if (error.code === 409) {
      console.log(`⚠️  userId already exists in ${collectionName}`);
    } else {
      console.error(`❌ Error adding userId to ${collectionName}:`, error.message);
    }
  }
}

async function fixAllCollections() {
  console.log('🔧 Adding userId field to collections...\n');

  // Collections that need userId
  await addUserIdToCollection('accounts', 'accounts');
  await addUserIdToCollection('plaidTransactions', 'plaidTransactions');
  await addUserIdToCollection('categories', 'categories');
  await addUserIdToCollection('tags', 'tags');
  await addUserIdToCollection('files', 'files');

  // Also add missing fields to transactions
  console.log('\n🔧 Checking transactions collection...');
  try {
    await databases.createStringAttribute(DATABASE_ID, 'transactions', 'userId', 36, true);
    console.log('✅ Added userId to transactions');
  } catch (error) {
    if (error.code === 409) {
      console.log('⚠️  userId already exists in transactions');
    } else {
      console.error('❌ Error:', error.message);
    }
  }

  console.log('\n✨ Fix complete!');
}

fixAllCollections();
