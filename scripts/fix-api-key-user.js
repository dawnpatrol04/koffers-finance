require('dotenv').config({ path: '.env.local' });
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = 'koffers_poc';

async function fixApiKey() {
  try {
    const keyToFix = 'kf_live_E8amIwJCyQnE-n8Xwazyhaoiiq11gMTS';
    const correctUserId = '68feda5ccfd38390a7d7'; // User with accounts
    
    console.log('Finding API key...');
    
    const keys = await databases.listDocuments(
      DATABASE_ID,
      'apiKeys',
      [Query.equal('keyValue', keyToFix)]
    );
    
    if (keys.documents.length > 0) {
      const key = keys.documents[0];
      console.log('Found API key:', key.$id);
      console.log('Current userId:', key.userId);
      console.log('Updating to userId:', correctUserId);
      
      await databases.updateDocument(
        DATABASE_ID,
        'apiKeys',
        key.$id,
        { userId: correctUserId }
      );
      
      console.log('\n✅ API key updated successfully!');
      console.log('MCP server will now return data for the user with accounts.');
      
    } else {
      console.log('API key not found in database!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixApiKey();
