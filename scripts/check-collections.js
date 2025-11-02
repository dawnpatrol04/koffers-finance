require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function checkCollections() {
  try {
    console.log('Checking collections in database:', DATABASE_ID);
    
    const db = await databases.get(DATABASE_ID);
    console.log('\nDatabase exists:', db.name);
    
    const collections = await databases.listCollections(DATABASE_ID);
    console.log('\nCollections found:', collections.total);
    collections.collections.forEach(col => {
      console.log(`  - ${col.$id} (${col.name})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCollections();
