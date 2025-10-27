/**
 * Appwrite Database Collections Setup Script
 *
 * This script creates the necessary collections and attributes for Plaid bank integration.
 * Run this once to set up your Appwrite database.
 *
 * Usage: npx tsx scripts/setup-bank-collections.ts
 */

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

// Configuration
const config = {
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  apiKey: process.env.APPWRITE_API_KEY!, // Server API key with full permissions
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_db',
};

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setKey(config.apiKey);

const databases = new Databases(client);

async function createBankConnectionsCollection() {
  console.log('\n📦 Creating bank_connections collection...');

  try {
    const collection = await databases.createCollection(
      config.databaseId,
      'bank_connections',
      'Bank Connections',
      [
        Permission.read(Role.team(ID.custom('team'))),
        Permission.create(Role.team(ID.custom('team'))),
        Permission.update(Role.team(ID.custom('team'))),
        Permission.delete(Role.team(ID.custom('team'))),
      ],
      false, // documentSecurity - we'll use collection-level permissions
      true,  // enabled
    );

    console.log('✅ Collection created:', collection.$id);

    // Create attributes
    const attributes = [
      {
        key: 'team_id',
        type: 'string',
        size: 255,
        required: true,
        array: false,
      },
      {
        key: 'institution_id',
        type: 'string',
        size: 255,
        required: true,
        array: false,
      },
      {
        key: 'item_id',
        type: 'string',
        size: 255,
        required: true,
        array: false,
      },
      {
        key: 'access_token',
        type: 'string',
        size: 1000, // Encrypted tokens are longer
        required: true,
        array: false,
      },
      {
        key: 'status',
        type: 'enum',
        elements: ['active', 'error', 'disconnected'],
        required: true,
        array: false,
      },
      {
        key: 'error_code',
        type: 'string',
        size: 255,
        required: false,
        array: false,
      },
      {
        key: 'created_at',
        type: 'datetime',
        required: true,
        array: false,
      },
      {
        key: 'updated_at',
        type: 'datetime',
        required: true,
        array: false,
      },
    ];

    console.log('\n📝 Creating attributes...');

    for (const attr of attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            config.databaseId,
            'bank_connections',
            attr.key,
            attr.size as number,
            attr.required,
            undefined, // default
            attr.array
          );
        } else if (attr.type === 'enum') {
          await databases.createEnumAttribute(
            config.databaseId,
            'bank_connections',
            attr.key,
            attr.elements as string[],
            attr.required,
            undefined, // default
            attr.array
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            config.databaseId,
            'bank_connections',
            attr.key,
            attr.required,
            undefined, // default
            attr.array
          );
        }
        console.log(`  ✅ Created attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ⏭️  Attribute already exists: ${attr.key}`);
        } else {
          throw error;
        }
      }
    }

    // Create indexes
    console.log('\n🔍 Creating indexes...');

    const indexes = [
      { key: 'team_id_idx', attributes: ['team_id'], type: 'key' },
      { key: 'item_id_idx', attributes: ['item_id'], type: 'unique' },
      { key: 'status_idx', attributes: ['status'], type: 'key' },
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          config.databaseId,
          'bank_connections',
          index.key,
          index.type as any,
          index.attributes
        );
        console.log(`  ✅ Created index: ${index.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ⏭️  Index already exists: ${index.key}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ bank_connections collection setup complete!');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('⏭️  Collection already exists: bank_connections');
    } else {
      console.error('❌ Error creating bank_connections:', error);
      throw error;
    }
  }
}

async function createBankAccountsCollection() {
  console.log('\n📦 Creating bank_accounts collection...');

  try {
    const collection = await databases.createCollection(
      config.databaseId,
      'bank_accounts',
      'Bank Accounts',
      [
        Permission.read(Role.team(ID.custom('team'))),
        Permission.create(Role.team(ID.custom('team'))),
        Permission.update(Role.team(ID.custom('team'))),
        Permission.delete(Role.team(ID.custom('team'))),
      ],
      false,
      true,
    );

    console.log('✅ Collection created:', collection.$id);

    // Create attributes
    const attributes = [
      { key: 'connection_id', type: 'string', size: 255, required: true },
      { key: 'team_id', type: 'string', size: 255, required: true },
      { key: 'account_id', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 500, required: true },
      { key: 'mask', type: 'string', size: 10, required: false },
      { key: 'type', type: 'string', size: 100, required: true },
      { key: 'subtype', type: 'string', size: 100, required: false },
      { key: 'currency', type: 'string', size: 10, required: true },
      { key: 'balance_available', type: 'float', required: false },
      { key: 'balance_current', type: 'float', required: false },
      { key: 'balance_limit', type: 'float', required: false },
      { key: 'enabled', type: 'boolean', required: true, default: true },
      { key: 'created_at', type: 'datetime', required: true },
      { key: 'updated_at', type: 'datetime', required: true },
    ];

    console.log('\n📝 Creating attributes...');

    for (const attr of attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(
            config.databaseId,
            'bank_accounts',
            attr.key,
            attr.size as number,
            attr.required,
            undefined,
            false
          );
        } else if (attr.type === 'float') {
          await databases.createFloatAttribute(
            config.databaseId,
            'bank_accounts',
            attr.key,
            attr.required,
            undefined, // min
            undefined, // max
            undefined, // default
            false
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            config.databaseId,
            'bank_accounts',
            attr.key,
            attr.required,
            (attr as any).default,
            false
          );
        } else if (attr.type === 'datetime') {
          await databases.createDatetimeAttribute(
            config.databaseId,
            'bank_accounts',
            attr.key,
            attr.required,
            undefined,
            false
          );
        }
        console.log(`  ✅ Created attribute: ${attr.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ⏭️  Attribute already exists: ${attr.key}`);
        } else {
          throw error;
        }
      }
    }

    // Create indexes
    console.log('\n🔍 Creating indexes...');

    const indexes = [
      { key: 'team_id_idx', attributes: ['team_id'], type: 'key' },
      { key: 'connection_id_idx', attributes: ['connection_id'], type: 'key' },
      { key: 'account_id_idx', attributes: ['account_id'], type: 'unique' },
      { key: 'enabled_idx', attributes: ['enabled'], type: 'key' },
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          config.databaseId,
          'bank_accounts',
          index.key,
          index.type as any,
          index.attributes
        );
        console.log(`  ✅ Created index: ${index.key}`);
      } catch (error: any) {
        if (error.code === 409) {
          console.log(`  ⏭️  Index already exists: ${index.key}`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ bank_accounts collection setup complete!');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('⏭️  Collection already exists: bank_accounts');
    } else {
      console.error('❌ Error creating bank_accounts:', error);
      throw error;
    }
  }
}

async function main() {
  console.log('🚀 Starting Appwrite database setup for Plaid integration...');
  console.log(`📍 Endpoint: ${config.endpoint}`);
  console.log(`📁 Project: ${config.projectId}`);
  console.log(`💾 Database: ${config.databaseId}`);

  // Validate required env vars
  if (!config.projectId) {
    throw new Error('❌ NEXT_PUBLIC_APPWRITE_PROJECT_ID is required');
  }
  if (!config.apiKey) {
    throw new Error('❌ APPWRITE_API_KEY is required. Get it from Appwrite Console > Settings > API Keys');
  }

  try {
    // Create or verify database exists
    try {
      await databases.get(config.databaseId);
      console.log(`✅ Database exists: ${config.databaseId}`);
    } catch (error: any) {
      if (error.code === 404) {
        console.log(`📦 Creating database: ${config.databaseId}...`);
        await databases.create(config.databaseId, 'Koffers Database');
        console.log('✅ Database created!');
      } else {
        throw error;
      }
    }

    // Create collections
    await createBankConnectionsCollection();
    await createBankAccountsCollection();

    console.log('\n🎉 All done! Database setup complete.');
    console.log('\n📚 Collections created:');
    console.log('  - bank_connections (stores Plaid connection metadata and access tokens)');
    console.log('  - bank_accounts (stores individual bank accounts)');
    console.log('\n⚠️  IMPORTANT:');
    console.log('  - Access tokens in bank_connections should be encrypted before storing');
    console.log('  - Add ENCRYPTION_KEY to your .env.local (see docs/PLAID_SETUP_GUIDE.md)');
    console.log('  - Configure collection permissions in Appwrite Console if needed');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
