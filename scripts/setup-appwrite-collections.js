/**
 * Appwrite Collections Setup Script
 *
 * This script creates all 13 collections for Koffers Finance app
 * Based on SCHEMA_DDL.sql and UI_TO_DATABASE_MAPPING.md
 *
 * Run with: node scripts/setup-appwrite-collections.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Client, Databases, ID, Permission, Role } = require('node-appwrite');

// Configuration
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

// Initialize client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const databases = new Databases(client);

// Collection definitions
const COLLECTIONS = {
  // Core collections
  ACCOUNTS: 'accounts',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  TRANSACTIONS: 'transactions',
  RECEIPT_ITEMS: 'receiptItems',
  REMINDERS: 'reminders',
  FILES: 'files',

  // Join tables
  TRANSACTION_TAGS: 'transactionTags',
  ITEM_TAGS: 'itemTags',
  FILE_TAGS: 'fileTags',

  // Plaid integration
  PLAID_ITEMS: 'plaidItems',
  PLAID_TRANSACTIONS: 'plaidTransactions',
};

/**
 * Step 1: Create or get database
 */
async function createDatabase() {
  try {
    console.log(`\n📦 Creating database: ${DATABASE_ID}`);
    const database = await databases.create(DATABASE_ID, 'Koffers Main Database');
    console.log('✅ Database created');
    return database;
  } catch (error) {
    if (error.code === 409) {
      console.log('✅ Database already exists');
      return await databases.get(DATABASE_ID);
    }
    throw error;
  }
}

/**
 * Step 2: Create collections with attributes
 */

async function createAccountsCollection() {
  console.log('\n🏦 Creating ACCOUNTS collection...');

  try {
    const collection = await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.ACCOUNTS,
      'Accounts',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    // Add attributes
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'name', 255, true);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'type', ['checking', 'savings', 'credit', 'investment'], true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'institution', 255, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'lastFour', 4, false);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'currentBalance', false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'plaidItemId', 255, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'plaidAccountId', 255, false);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'isActive', true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'color', 7, false);

    // Create indexes
    await databases.createIndex(DATABASE_ID, COLLECTIONS.ACCOUNTS, 'idx_plaidItemId', 'key', ['plaidItemId']);

    console.log('✅ Accounts collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Accounts collection already exists');
    else throw error;
  }
}

async function createCategoriesCollection() {
  console.log('\n📂 Creating CATEGORIES collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.CATEGORIES,
      'Categories',
      [
        Permission.read(Role.any()),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.CATEGORIES, 'name', 255, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.CATEGORIES, 'parentId', 36, false);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.CATEGORIES, 'type', ['expense', 'income', 'transfer'], true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.CATEGORIES, 'icon', 50, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.CATEGORIES, 'color', 7, false);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTIONS.CATEGORIES, 'isSystem', false, false);
    await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.CATEGORIES, 'sortOrder', false);

    await databases.createIndex(DATABASE_ID, COLLECTIONS.CATEGORIES, 'idx_type', 'key', ['type']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.CATEGORIES, 'idx_sortOrder', 'key', ['sortOrder']);

    console.log('✅ Categories collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Categories collection already exists');
    else throw error;
  }
}

async function createTagsCollection() {
  console.log('\n🏷️  Creating TAGS collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.TAGS,
      'Tags',
      [
        Permission.read(Role.any()),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TAGS, 'label', 100, true);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.TAGS, 'type', ['business', 'personal', 'custom'], true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TAGS, 'color', 7, false);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTIONS.TAGS, 'isSystem', false, false);

    console.log('✅ Tags collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Tags collection already exists');
    else throw error;
  }
}

async function createTransactionsCollection() {
  console.log('\n💳 Creating TRANSACTIONS collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.TRANSACTIONS,
      'Transactions',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    // Core fields
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'accountId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'plaidTransactionId', 255, false);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'date', true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'amount', true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'merchant', 255, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'merchantSubtext', 255, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'description', 5000, false);

    // Classification
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'categoryId', 36, false);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'status', ['pending', 'completed', 'cleared'], true);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'channel', ['in-store', 'online', 'other'], true);

    // Links
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'fileId', 36, false);

    // User annotations
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'commentary', 5000, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'reviewedBy', 36, false);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'reviewedAt', false);

    // Indexes
    await databases.createIndex(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'idx_date', 'key', ['date'], ['DESC']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'idx_accountId', 'key', ['accountId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'idx_categoryId', 'key', ['categoryId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.TRANSACTIONS, 'idx_status', 'key', ['status']);

    console.log('✅ Transactions collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Transactions collection already exists');
    else throw error;
  }
}

async function createReceiptItemsCollection() {
  console.log('\n🧾 Creating RECEIPT_ITEMS collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.RECEIPT_ITEMS,
      'Receipt Items',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'transactionId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'name', 255, true);
    await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'quantity', true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'price', true);
    await databases.createFloatAttribute(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'totalPrice', false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'category', 100, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'sku', 100, false);
    await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'sortOrder', false);

    await databases.createIndex(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'idx_transactionId', 'key', ['transactionId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.RECEIPT_ITEMS, 'idx_sortOrder', 'key', ['transactionId', 'sortOrder']);

    console.log('✅ Receipt Items collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Receipt Items collection already exists');
    else throw error;
  }
}

async function createRemindersCollection() {
  console.log('\n⏰ Creating REMINDERS collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.REMINDERS,
      'Reminders',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.REMINDERS, 'transactionId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.REMINDERS, 'message', 500, true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTIONS.REMINDERS, 'dueDate', false);
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTIONS.REMINDERS, 'completed', false, false);

    // Unique index on transactionId (1-to-1 relationship)
    await databases.createIndex(DATABASE_ID, COLLECTIONS.REMINDERS, 'idx_transactionId_unique', 'unique', ['transactionId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.REMINDERS, 'idx_dueDate', 'key', ['dueDate']);

    console.log('✅ Reminders collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Reminders collection already exists');
    else throw error;
  }
}

async function createFilesCollection() {
  console.log('\n📄 Creating FILES collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.FILES,
      'Files',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'transactionId', 36, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'name', 255, true);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.FILES, 'type', ['receipt', 'bank-statement', 'tax-document', 'other'], true);
    await databases.createIntegerAttribute(DATABASE_ID, COLLECTIONS.FILES, 'size', true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'mimeType', 100, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'storageFileId', 255, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'url', 2000, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'thumbnailUrl', 2000, false);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTIONS.FILES, 'uploadedAt', true);

    // Receipt-specific
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTIONS.FILES, 'isReceipt', false, false);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.FILES, 'matchStatus', ['matched', 'pending', 'unmatched'], false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'receiptData', 65535, false); // JSON string

    // User metadata
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'title', 255, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILES, 'description', 2000, false);

    await databases.createIndex(DATABASE_ID, COLLECTIONS.FILES, 'idx_uploadedAt', 'key', ['uploadedAt'], ['DESC']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.FILES, 'idx_transactionId', 'key', ['transactionId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.FILES, 'idx_matchStatus', 'key', ['matchStatus']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.FILES, 'idx_type', 'key', ['type']);

    console.log('✅ Files collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Files collection already exists');
    else throw error;
  }
}

async function createTransactionTagsCollection() {
  console.log('\n🔗 Creating TRANSACTION_TAGS join collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.TRANSACTION_TAGS,
      'Transaction Tags',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTION_TAGS, 'transactionId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.TRANSACTION_TAGS, 'tagId', 36, true);

    await databases.createIndex(DATABASE_ID, COLLECTIONS.TRANSACTION_TAGS, 'idx_transactionId', 'key', ['transactionId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.TRANSACTION_TAGS, 'idx_tagId', 'key', ['tagId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.TRANSACTION_TAGS, 'idx_unique', 'unique', ['transactionId', 'tagId']);

    console.log('✅ Transaction Tags collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Transaction Tags collection already exists');
    else throw error;
  }
}

async function createItemTagsCollection() {
  console.log('\n🔗 Creating ITEM_TAGS join collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.ITEM_TAGS,
      'Item Tags',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.ITEM_TAGS, 'receiptItemId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.ITEM_TAGS, 'tagId', 36, true);

    await databases.createIndex(DATABASE_ID, COLLECTIONS.ITEM_TAGS, 'idx_receiptItemId', 'key', ['receiptItemId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.ITEM_TAGS, 'idx_tagId', 'key', ['tagId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.ITEM_TAGS, 'idx_unique', 'unique', ['receiptItemId', 'tagId']);

    console.log('✅ Item Tags collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Item Tags collection already exists');
    else throw error;
  }
}

async function createFileTagsCollection() {
  console.log('\n🔗 Creating FILE_TAGS join collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.FILE_TAGS,
      'File Tags',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILE_TAGS, 'fileId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.FILE_TAGS, 'tagId', 36, true);

    await databases.createIndex(DATABASE_ID, COLLECTIONS.FILE_TAGS, 'idx_fileId', 'key', ['fileId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.FILE_TAGS, 'idx_tagId', 'key', ['tagId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.FILE_TAGS, 'idx_unique', 'unique', ['fileId', 'tagId']);

    console.log('✅ File Tags collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  File Tags collection already exists');
    else throw error;
  }
}

async function createPlaidItemsCollection() {
  console.log('\n🏦 Creating PLAID_ITEMS collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.PLAID_ITEMS,
      'Plaid Items',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_ITEMS, 'itemId', 255, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_ITEMS, 'accessToken', 2000, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_ITEMS, 'institutionId', 100, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_ITEMS, 'institutionName', 255, true);
    await databases.createEnumAttribute(DATABASE_ID, COLLECTIONS.PLAID_ITEMS, 'status', ['active', 'error', 'reauth_required'], true);
    await databases.createDatetimeAttribute(DATABASE_ID, COLLECTIONS.PLAID_ITEMS, 'lastSync', false);

    await databases.createIndex(DATABASE_ID, COLLECTIONS.PLAID_ITEMS, 'idx_itemId_unique', 'unique', ['itemId']);

    console.log('✅ Plaid Items collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Plaid Items collection already exists');
    else throw error;
  }
}

async function createPlaidTransactionsCollection() {
  console.log('\n💳 Creating PLAID_TRANSACTIONS collection...');

  try {
    await databases.createCollection(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      'Plaid Transactions',
      [
        Permission.read(Role.user('USER_ID')),
        Permission.create(Role.user('USER_ID')),
        Permission.update(Role.user('USER_ID')),
        Permission.delete(Role.user('USER_ID')),
      ]
    );

    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'plaidItemId', 36, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'plaidAccountId', 255, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'plaidTransactionId', 255, true);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'transactionId', 36, false);
    await databases.createStringAttribute(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'rawData', 65535, true); // JSON string
    await databases.createBooleanAttribute(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'processed', false, false);

    await databases.createIndex(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'idx_plaidTransactionId_unique', 'unique', ['plaidTransactionId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'idx_plaidItemId', 'key', ['plaidItemId']);
    await databases.createIndex(DATABASE_ID, COLLECTIONS.PLAID_TRANSACTIONS, 'idx_processed', 'key', ['processed']);

    console.log('✅ Plaid Transactions collection created');
  } catch (error) {
    if (error.code === 409) console.log('⚠️  Plaid Transactions collection already exists');
    else throw error;
  }
}

/**
 * Step 3: Seed system data (categories, tags)
 */
async function seedSystemData() {
  console.log('\n🌱 Seeding system data...');

  // System categories
  const systemCategories = [
    { id: 'cat_groceries', name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#4caf50', isSystem: true, sortOrder: 10 },
    { id: 'cat_dining', name: 'Dining Out', type: 'expense', icon: 'restaurant', color: '#ff9800', isSystem: true, sortOrder: 20 },
    { id: 'cat_gas', name: 'Gas & Fuel', type: 'expense', icon: 'local-gas', color: '#f44336', isSystem: true, sortOrder: 30 },
    { id: 'cat_transportation', name: 'Transportation', type: 'expense', icon: 'directions-car', color: '#2196f3', isSystem: true, sortOrder: 40 },
    { id: 'cat_utilities', name: 'Utilities', type: 'expense', icon: 'bolt', color: '#9c27b0', isSystem: true, sortOrder: 50 },
    { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: 'theater', color: '#e91e63', isSystem: true, sortOrder: 60 },
    { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#ff5722', isSystem: true, sortOrder: 70 },
    { id: 'cat_healthcare', name: 'Healthcare', type: 'expense', icon: 'local-hospital', color: '#00bcd4', isSystem: true, sortOrder: 80 },
    { id: 'cat_insurance', name: 'Insurance', type: 'expense', icon: 'security', color: '#607d8b', isSystem: true, sortOrder: 90 },
    { id: 'cat_subscriptions', name: 'Subscriptions', type: 'expense', icon: 'autorenew', color: '#795548', isSystem: true, sortOrder: 100 },
    { id: 'cat_income_salary', name: 'Salary', type: 'income', icon: 'attach-money', color: '#4caf50', isSystem: true, sortOrder: 10 },
    { id: 'cat_income_other', name: 'Other Income', type: 'income', icon: 'trending-up', color: '#8bc34a', isSystem: true, sortOrder: 20 },
    { id: 'cat_transfer', name: 'Transfer', type: 'transfer', icon: 'swap-horiz', color: '#9e9e9e', isSystem: true, sortOrder: 10 },
  ];

  for (const category of systemCategories) {
    try {
      const { id, ...categoryData } = category; // Remove id from data
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.CATEGORIES,
        id, // Pass id as document ID parameter
        categoryData,
        [Permission.read(Role.any())]
      );
      console.log(`✅ Created category: ${category.name}`);
    } catch (error) {
      if (error.code === 409) {
        console.log(`⚠️  Category already exists: ${category.name}`);
      } else {
        console.error(`❌ Error creating category ${category.name}:`, error.message);
      }
    }
  }

  // System tags
  const systemTags = [
    { id: 'tag_business', label: 'business', type: 'business', color: '#1976d2', isSystem: true },
    { id: 'tag_personal', label: 'personal', type: 'personal', color: '#388e3c', isSystem: true },
  ];

  for (const tag of systemTags) {
    try {
      const { id, ...tagData } = tag; // Remove id from data
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.TAGS,
        id, // Pass id as document ID parameter
        tagData,
        [Permission.read(Role.any())]
      );
      console.log(`✅ Created tag: ${tag.label}`);
    } catch (error) {
      if (error.code === 409) {
        console.log(`⚠️  Tag already exists: ${tag.label}`);
      } else {
        console.error(`❌ Error creating tag ${tag.label}:`, error.message);
      }
    }
  }
}

/**
 * Step 4: List and optionally clean up old collections
 */
async function cleanupOldCollections() {
  console.log('\n🧹 Checking for old collections...');

  try {
    const collections = await databases.listCollections(DATABASE_ID);
    const validCollectionIds = Object.values(COLLECTIONS);

    const oldCollections = collections.collections.filter(
      col => !validCollectionIds.includes(col.$id)
    );

    if (oldCollections.length === 0) {
      console.log('✅ No old collections found');
      return;
    }

    console.log(`\n⚠️  Found ${oldCollections.length} old collections to delete:`);
    oldCollections.forEach(col => {
      console.log(`   - ${col.name} (${col.$id})`);
    });

    console.log('\n🗑️  Deleting old collections...');

    for (const col of oldCollections) {
      try {
        await databases.deleteCollection(DATABASE_ID, col.$id);
        console.log(`✅ Deleted: ${col.name} (${col.$id})`);
      } catch (error) {
        console.error(`❌ Error deleting ${col.name}:`, error.message);
      }
    }

    console.log('✅ Old collections cleanup complete');

  } catch (error) {
    console.error('❌ Error checking collections:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Appwrite Collections Setup for Koffers Finance\n');
  console.log('📋 This will create 13 collections based on SCHEMA_DDL.sql\n');

  try {
    // Validate environment variables
    if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
      throw new Error('Missing required environment variables: APPWRITE_PROJECT_ID and APPWRITE_API_KEY');
    }

    // Create database
    await createDatabase();

    // Create all collections
    await createAccountsCollection();
    await createCategoriesCollection();
    await createTagsCollection();
    await createTransactionsCollection();
    await createReceiptItemsCollection();
    await createRemindersCollection();
    await createFilesCollection();
    await createTransactionTagsCollection();
    await createItemTagsCollection();
    await createFileTagsCollection();
    await createPlaidItemsCollection();
    await createPlaidTransactionsCollection();

    // Seed system data
    await seedSystemData();

    // Cleanup check
    await cleanupOldCollections();

    console.log('\n✨ Setup complete!\n');
    console.log('📚 Collections created:');
    Object.entries(COLLECTIONS).forEach(([name, id]) => {
      console.log(`   ✓ ${name}: ${id}`);
    });

    console.log('\n🎯 Next steps:');
    console.log('   1. Review collections in Appwrite Console');
    console.log('   2. Update TypeScript types to match schema');
    console.log('   3. Build API endpoints for CRUD operations');
    console.log('   4. Wire up UI components to real data\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the setup
main();
