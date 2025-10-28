/**
 * Setup Appwrite Database and Collections for Plaid Integration
 *
 * Run with: npx tsx scripts/setup-database.ts
 */

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

async function setupDatabase() {
  console.log('🚀 Setting up Appwrite database...\n');

  try {
    // Try to get existing database
    try {
      const db = await databases.get(DATABASE_ID);
      console.log(`✅ Database "${db.name}" already exists (ID: ${DATABASE_ID})`);
    } catch (error: any) {
      if (error.code === 404) {
        // Create database
        console.log(`📦 Creating database: ${DATABASE_ID}`);
        await databases.create(DATABASE_ID, 'Koffers POC Database', true);
        console.log('✅ Database created successfully');
      } else {
        throw error;
      }
    }

    // Define collections
    const collections = [
      {
        id: 'plaid_items',
        name: 'Plaid Items',
        attributes: [
          { key: 'userId', type: 'string', size: 255, required: true },
          { key: 'itemId', type: 'string', size: 255, required: true },
          { key: 'accessToken', type: 'string', size: 500, required: true, encrypt: true },
          { key: 'institutionId', type: 'string', size: 255, required: false },
          { key: 'institutionName', type: 'string', size: 255, required: false },
        ],
      },
      {
        id: 'plaid_accounts',
        name: 'Plaid Accounts',
        attributes: [
          { key: 'userId', type: 'string', size: 255, required: true },
          { key: 'itemId', type: 'string', size: 255, required: true },
          { key: 'accountId', type: 'string', size: 255, required: true },
          { key: 'name', type: 'string', size: 255, required: true },
          { key: 'officialName', type: 'string', size: 255, required: false },
          { key: 'type', type: 'string', size: 100, required: true },
          { key: 'subtype', type: 'string', size: 100, required: true },
          { key: 'mask', type: 'string', size: 50, required: false },
          { key: 'currentBalance', type: 'float', required: false },
          { key: 'availableBalance', type: 'float', required: false },
          { key: 'isoCurrencyCode', type: 'string', size: 10, required: false },
        ],
      },
      {
        id: 'plaid_transactions',
        name: 'Plaid Transactions',
        attributes: [
          { key: 'userId', type: 'string', size: 255, required: true },
          { key: 'accountId', type: 'string', size: 255, required: true },
          { key: 'transactionId', type: 'string', size: 255, required: true },
          { key: 'date', type: 'datetime', required: true },
          { key: 'name', type: 'string', size: 500, required: true },
          { key: 'merchantName', type: 'string', size: 500, required: false },
          { key: 'amount', type: 'float', required: true },
          { key: 'isoCurrencyCode', type: 'string', size: 10, required: false },
          { key: 'pending', type: 'boolean', required: true },
          { key: 'category', type: 'string', size: 1000, required: false },
          { key: 'paymentChannel', type: 'string', size: 100, required: false },
        ],
      },
    ];

    // Create collections
    for (const collectionConfig of collections) {
      try {
        // Try to get existing collection
        const collection = await databases.getCollection(DATABASE_ID, collectionConfig.id);
        console.log(`✅ Collection "${collection.name}" already exists`);
      } catch (error: any) {
        if (error.code === 404) {
          // Create collection
          console.log(`\n📋 Creating collection: ${collectionConfig.name}`);
          const collection = await databases.createCollection(
            DATABASE_ID,
            collectionConfig.id,
            collectionConfig.name,
            [
              Permission.read(Role.any()),
              Permission.create(Role.users()),
              Permission.update(Role.users()),
              Permission.delete(Role.users()),
            ],
            false, // document security disabled - using collection level permissions
            true   // enabled
          );
          console.log(`✅ Collection created: ${collection.$id}`);

          // Create attributes
          for (const attr of collectionConfig.attributes) {
            console.log(`  ➕ Adding attribute: ${attr.key} (${attr.type})`);

            if (attr.type === 'string') {
              await databases.createStringAttribute(
                DATABASE_ID,
                collectionConfig.id,
                attr.key,
                attr.size,
                attr.required,
                undefined,
                attr.encrypt || false
              );
            } else if (attr.type === 'float') {
              await databases.createFloatAttribute(
                DATABASE_ID,
                collectionConfig.id,
                attr.key,
                attr.required
              );
            } else if (attr.type === 'boolean') {
              await databases.createBooleanAttribute(
                DATABASE_ID,
                collectionConfig.id,
                attr.key,
                attr.required
              );
            } else if (attr.type === 'datetime') {
              await databases.createDatetimeAttribute(
                DATABASE_ID,
                collectionConfig.id,
                attr.key,
                attr.required
              );
            }
          }

          // Wait for attributes to be available
          console.log('  ⏳ Waiting for attributes to be ready...');
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Create indexes
          console.log('  🔍 Creating indexes...');

          if (collectionConfig.id === 'plaid_items') {
            await databases.createIndex(DATABASE_ID, collectionConfig.id, 'userId_idx', 'key', ['userId'], ['ASC']);
            await databases.createIndex(DATABASE_ID, collectionConfig.id, 'itemId_idx', 'key', ['itemId'], ['ASC']);
          } else if (collectionConfig.id === 'plaid_accounts') {
            await databases.createIndex(DATABASE_ID, collectionConfig.id, 'userId_idx', 'key', ['userId'], ['ASC']);
            await databases.createIndex(DATABASE_ID, collectionConfig.id, 'accountId_idx', 'key', ['accountId'], ['ASC']);
          } else if (collectionConfig.id === 'plaid_transactions') {
            await databases.createIndex(DATABASE_ID, collectionConfig.id, 'userId_idx', 'key', ['userId'], ['ASC']);
            await databases.createIndex(DATABASE_ID, collectionConfig.id, 'accountId_idx', 'key', ['accountId'], ['ASC']);
            await databases.createIndex(DATABASE_ID, collectionConfig.id, 'date_idx', 'key', ['date'], ['DESC']);
          }

          console.log(`✅ Collection setup complete: ${collectionConfig.name}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✨ Database setup complete!\n');
    console.log('Database ID:', DATABASE_ID);
    console.log('Collections:');
    collections.forEach(c => console.log(`  - ${c.name} (${c.id})`));

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
