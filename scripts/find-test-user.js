require('dotenv').config({ path: '.env.local' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = 'koffers_poc';

async function findTestUser() {
  try {
    // Find all users with accounts
    const accounts = await databases.listDocuments(
      DATABASE_ID,
      'accounts',
      [Query.limit(100)]
    );
    
    console.log('Found', accounts.total, 'total accounts\n');
    
    // Get unique userIds
    const userIds = [...new Set(accounts.documents.map(acc => acc.userId))];
    
    console.log('Accounts belong to', userIds.length, 'unique users:\n');
    
    for (const userId of userIds) {
      const userAccounts = accounts.documents.filter(acc => acc.userId === userId);
      console.log(`User ID: ${userId}`);
      console.log(`  Accounts: ${userAccounts.length}`);
      userAccounts.forEach(acc => {
        console.log(`    - ${acc.name} (${acc.type}) - $${acc.currentBalance}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findTestUser();
