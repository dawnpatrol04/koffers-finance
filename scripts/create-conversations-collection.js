const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: '.env.production' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function createConversationsCollection() {
    try {
        console.log('Creating conversations collection...');
        console.log('Database ID:', databaseId);

        // Create collection with permissions
        const collection = await databases.createCollection(
            databaseId,
            'conversations', // Use the collection ID directly
            'conversations', // Display name
            [
                Permission.read(Role.users()),
                Permission.create(Role.users()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ]
        );

        console.log('✅ Collection created:', collection.$id);

        // Create attributes
        console.log('Creating attributes...');

        await databases.createStringAttribute(databaseId, collection.$id, 'userId', 255, true);
        console.log('  - userId attribute created');

        await databases.createStringAttribute(databaseId, collection.$id, 'title', 500, true);
        console.log('  - title attribute created');

        await databases.createBooleanAttribute(databaseId, collection.$id, 'isPinned', false, false);
        console.log('  - isPinned attribute created');

        await databases.createIntegerAttribute(databaseId, collection.$id, 'messageCount', false, 0);
        console.log('  - messageCount attribute created');

        // Wait for attributes to be available
        console.log('Waiting for attributes to be processed...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Create indexes
        console.log('Creating indexes...');

        await databases.createIndex(databaseId, collection.$id, 'userId_idx', 'key', ['userId'], ['ASC']);
        console.log('  - userId index created');

        await databases.createIndex(databaseId, collection.$id, 'updatedAt_idx', 'key', ['$updatedAt'], ['DESC']);
        console.log('  - $updatedAt index created');

        await databases.createIndex(databaseId, collection.$id, 'isPinned_idx', 'key', ['isPinned'], ['DESC']);
        console.log('  - isPinned index created');

        console.log('\n✅ Conversations collection setup complete!');
        console.log('Collection ID:', collection.$id);
        console.log('Database ID:', databaseId);
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    }
}

createConversationsCollection();
