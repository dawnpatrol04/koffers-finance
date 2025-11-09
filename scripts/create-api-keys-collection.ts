/**
 * One-time script to create the api_keys collection in Appwrite
 * Run with: npx ts-node scripts/create-api-keys-collection.ts
 */

import { Client, Databases, Permission, Role, IndexType } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';
const COLLECTION_ID = 'apiKeys';

async function createCollection() {
  try {
    console.log('Creating api_keys collection...');

    // Create collection
    const collection = await databases.createCollection(
      DATABASE_ID,
      COLLECTION_ID,
      'API Keys',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      false, // documentSecurity - using collection-level permissions
      true   // enabled
    );

    console.log('✅ Collection created:', collection.$id);

    // Create attributes
    console.log('Creating userId attribute...');
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'userId',
      128,
      true // required
    );

    console.log('Creating name attribute...');
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'name',
      255,
      true // required
    );

    console.log('Creating keyValue attribute...');
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'keyValue',
      1000,
      true // required
    );

    console.log('Creating keyPrefix attribute...');
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'keyPrefix',
      50,
      true // required
    );

    console.log('Creating lastUsedAt attribute...');
    await databases.createDatetimeAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'lastUsedAt',
      false // not required
    );

    console.log('Creating expiresAt attribute...');
    await databases.createDatetimeAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'expiresAt',
      false // not required
    );

    console.log('\n⏳ Waiting for attributes to be available (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Create index on userId for fast lookups
    console.log('Creating userId index...');
    await databases.createIndex(
      DATABASE_ID,
      COLLECTION_ID,
      'userId_idx',
      IndexType.Key,
      ['userId']
    );

    console.log('\n✅ API Keys collection created successfully!');
    console.log('Collection ID:', COLLECTION_ID);
    console.log('Attributes: userId, name, keyValue, keyPrefix, lastUsedAt, expiresAt');
    console.log('Index: userId_idx');

  } catch (error: any) {
    if (error.code === 409) {
      console.log('⚠️  Collection already exists');
    } else {
      console.error('❌ Error creating collection:', error);
      throw error;
    }
  }
}

createCollection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
