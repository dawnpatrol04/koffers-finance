const { Client, Databases, ID, Permission, Role } = require('node-appwrite');
require('dotenv').config({ path: '.env.production' });

const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function createChatMessagesCollection() {
    try {
        console.log('Creating chatMessages collection...');
        console.log('Database ID:', databaseId);

        // Create collection with permissions
        const collection = await databases.createCollection(
            databaseId,
            'chatMessages', // Use the collection ID directly
            'chatMessages', // Display name
            [
                Permission.read(Role.users()),
                Permission.create(Role.users()),
                Permission.update(Role.any()),
                Permission.delete(Role.users())
            ]
        );

        console.log('✅ Collection created:', collection.$id);

        // Create string attributes
        console.log('Creating attributes...');

        await databases.createStringAttribute(databaseId, collection.$id, 'userId', 255, true);
        console.log('  - userId attribute created');

        await databases.createStringAttribute(databaseId, collection.$id, 'role', 50, true);
        console.log('  - role attribute created');

        await databases.createStringAttribute(databaseId, collection.$id, 'content', 50000, true);
        console.log('  - content attribute created');

        await databases.createStringAttribute(databaseId, collection.$id, 'parts', 50000, true);
        console.log('  - parts attribute created');

        await databases.createStringAttribute(databaseId, collection.$id, 'toolInvocations', 50000, false);
        console.log('  - toolInvocations attribute created');

        await databases.createStringAttribute(databaseId, collection.$id, 'metadata', 10000, false);
        console.log('  - metadata attribute created');

        // Wait for attributes to be available (Appwrite processes them asynchronously)
        console.log('Waiting for attributes to be processed...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Create indexes
        console.log('Creating indexes...');

        await databases.createIndex(databaseId, collection.$id, 'userId_idx', 'key', ['userId'], ['ASC']);
        console.log('  - userId index created');

        await databases.createIndex(databaseId, collection.$id, 'createdAt_idx', 'key', ['$createdAt'], ['DESC']);
        console.log('  - $createdAt index created');

        console.log('\n✅ Chat messages collection setup complete!');
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

createChatMessagesCollection();
