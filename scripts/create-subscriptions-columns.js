const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://api.koffers.ai/v1')
  .setProject('68fdeb62001ad5c77f2f')
  .setKey('standard_66cde51c2c927d760cdfe5aa6562ff237bd4f3da179f564c592dfec3637601f0089b1e0bd785e2ce8f31aef4e32df4610c4891edcf2c0c8b904367c0859d9cb89332433cdd291f1b2e743ac9b8b7140c96c04e51ac8fd68b54121563374f2c18960b297f97aad78d2d2f90c52bdbabf86340461a40fb831f695c8f1f54c712dc');

const databases = new Databases(client);

const DATABASE_ID = 'koffers_poc';
const COLLECTION_ID = 'subscriptions';

async function createAttribute(createFn, name) {
  try {
    await createFn();
    console.log(`✓ Created ${name}`);
  } catch (error) {
    if (error.type === 'attribute_already_exists') {
      console.log(`⊘ ${name} already exists, skipping`);
    } else {
      throw error;
    }
  }
}

async function createColumns() {
  try {
    console.log('Creating string columns...\n');

    // 1. userId - String, required
    await createAttribute(
      () => databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'userId', 255, true),
      'userId'
    );

    // 2. status - String, optional with default
    await createAttribute(
      () => databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'status', 50, false, 'active'),
      'status'
    );

    // 3. currentPeriodEnd - String, optional
    await createAttribute(
      () => databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'currentPeriodEnd', 50, false),
      'currentPeriodEnd'
    );

    // 4. stripeCustomerId - String, optional
    await createAttribute(
      () => databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'stripeCustomerId', 255, false),
      'stripeCustomerId'
    );

    // 5. stripeSubscriptionId - String, optional
    await createAttribute(
      () => databases.createStringAttribute(DATABASE_ID, COLLECTION_ID, 'stripeSubscriptionId', 255, false),
      'stripeSubscriptionId'
    );

    console.log('\nCreating integer columns...\n');

    // 6. maxBanks - Integer, optional with default 3
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'maxBanks', false, 0, 1000, 3),
      'maxBanks'
    );

    // 7. maxChatsPerMonth - Integer, optional with default 100
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'maxChatsPerMonth', false, 0, 1000000, 100),
      'maxChatsPerMonth'
    );

    // 8. maxStorageGB - Integer, optional with default 5
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'maxStorageGB', false, 0, 10000, 5),
      'maxStorageGB'
    );

    // 9. currentBanksConnected - Integer, optional with default 0
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'currentBanksConnected', false, 0, 1000, 0),
      'currentBanksConnected'
    );

    // 10. currentChatsUsed - Integer, optional with default 0
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'currentChatsUsed', false, 0, 1000000, 0),
      'currentChatsUsed'
    );

    // 11. currentStorageUsedGB - Integer, optional with default 0
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'currentStorageUsedGB', false, 0, 10000, 0),
      'currentStorageUsedGB'
    );

    // 12. addonBanks - Integer, optional with default 0
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'addonBanks', false, 0, 1000, 0),
      'addonBanks'
    );

    // 13. addonChats - Integer, optional with default 0
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'addonChats', false, 0, 1000000, 0),
      'addonChats'
    );

    // 14. addonStorage - Integer, optional with default 0
    await createAttribute(
      () => databases.createIntegerAttribute(DATABASE_ID, COLLECTION_ID, 'addonStorage', false, 0, 10000, 0),
      'addonStorage'
    );

    console.log('\n✅ All columns created successfully!');
    console.log('\nNext steps:');
    console.log('1. Create indexes for userId and status');
    console.log('2. Set collection permissions');
    console.log('3. Test the billing page');

  } catch (error) {
    console.error('\n❌ Error creating columns:', error);
    process.exit(1);
  }
}

createColumns();
