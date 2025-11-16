const { Client, Databases } = require('node-appwrite');
require('dotenv').config({ path: '.env.production' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function addConversationIdAttribute() {
    try {
        console.log('Adding conversationId attribute to chatMessages...');

        await databases.createStringAttribute(
            databaseId,
            'chatMessages',
            'conversationId',
            255,
            true // required
        );

        console.log('✅ conversationId attribute created');

        // Wait for attribute to be processed
        console.log('Waiting for attribute to be processed...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Create index for conversationId
        await databases.createIndex(
            databaseId,
            'chatMessages',
            'conversationId_idx',
            'key',
            ['conversationId'],
            ['ASC']
        );

        console.log('✅ conversationId index created');
        console.log('\n✅ Migration complete!');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    }
}

addConversationIdAttribute();
