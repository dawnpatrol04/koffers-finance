require('dotenv').config({ path: '.env.local' });
const sdk = require('node-appwrite');

const client = new sdk.Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc';

async function processPlaidTransactions() {
  console.log('🔄 Processing Plaid transactions into transactions collection...\n');

  try {
    // First, build a map of Plaid account IDs to Appwrite account document IDs
    const accounts = await databases.listDocuments(DATABASE_ID, 'accounts');
    const plaidToAppwriteAccountMap = {};
    accounts.documents.forEach(acc => {
      plaidToAppwriteAccountMap[acc.plaidAccountId] = acc.$id;
    });

    console.log(`Found ${accounts.total} accounts in database\n`);

    // Get all plaidTransactions
    const plaidTxns = await databases.listDocuments(DATABASE_ID, 'plaidTransactions', [
      sdk.Query.limit(500)
    ]);

    console.log(`Found ${plaidTxns.total} Plaid transactions to process\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const plaidTxn of plaidTxns.documents) {
      try {
        // Check if already processed
        const existing = await databases.listDocuments(DATABASE_ID, 'transactions', [
          sdk.Query.equal('plaidTransactionId', plaidTxn.plaidTransactionId),
          sdk.Query.limit(1)
        ]);

        if (existing.documents.length > 0) {
          skipped++;
          continue;
        }

        // Parse raw Plaid data
        const rawData = JSON.parse(plaidTxn.rawData);

        // Map Plaid accountId to Appwrite account document ID
        const appwriteAccountId = plaidToAppwriteAccountMap[plaidTxn.plaidAccountId];
        if (!appwriteAccountId) {
          console.error(`  ⚠️  No account found for ${plaidTxn.plaidAccountId}`);
          errors++;
          continue;
        }

        // Create transaction record
        await databases.createDocument(
          DATABASE_ID,
          'transactions',
          sdk.ID.unique(),
          {
            userId: plaidTxn.userId,
            accountId: appwriteAccountId, // Use Appwrite account document ID
            plaidTransactionId: plaidTxn.plaidTransactionId,
            date: rawData.date,
            amount: rawData.amount,
            merchant: rawData.merchant_name || rawData.name,
            merchantSubtext: rawData.name,
            description: rawData.original_description || rawData.name,
            status: rawData.pending ? 'pending' : 'completed',
            channel: 'online' // Default, Plaid doesn't provide this
          }
        );

        processed++;

        if (processed % 20 === 0) {
          console.log(`  Progress: ${processed} processed, ${skipped} skipped`);
        }

      } catch (error) {
        console.error(`  ❌ Error processing ${plaidTxn.plaidTransactionId}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Processing complete!`);
    console.log(`   Processed: ${processed}`);
    console.log(`   Skipped (already exist): ${skipped}`);
    console.log(`   Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

processPlaidTransactions();
