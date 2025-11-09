require('dotenv').config({ path: '.env.local' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = 'koffers_poc';

async function checkApiKey() {
  try {
    const keyToCheck = 'kf_live_E8amIwJCyQnE-n8Xwazyhaoiiq11gMTS';
    
    console.log('Searching for API key:', keyToCheck.substring(0, 20) + '...');
    
    const keys = await databases.listDocuments(
      DATABASE_ID,
      'apiKeys',
      [Query.equal('keyValue', keyToCheck)]
    );
    
    if (keys.documents.length > 0) {
      const key = keys.documents[0];
      console.log('\nFound API key:');
      console.log('  ID:', key.$id);
      console.log('  Name:', key.name);
      console.log('  User ID:', key.userId);
      console.log('  Created:', key.$createdAt);
      
      // Now check if this user has any accounts
      console.log('\n\nChecking for accounts with userId:', key.userId);
      const accounts = await databases.listDocuments(
        DATABASE_ID,
        'accounts',
        [Query.equal('userId', key.userId)]
      );
      
      console.log('Found', accounts.total, 'accounts for this user');
      accounts.documents.forEach(acc => {
        console.log(`  - ${acc.name} (${acc.type}) - $${acc.currentBalance}`);
      });
      
    } else {
      console.log('API key not found in database!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkApiKey();
