const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

async function checkTransferFields() {
  try {
    // Get user's transactions
    const response = await databases.listDocuments(
      DATABASE_ID,
      'plaidTransactions',
      [
        Query.equal('userId', '67314285002e7f2de50e'), // dawnpatrol04@gmail.com user ID
        Query.limit(10)
      ]
    );

    console.log('\n=== ANALYZING PLAID TRANSACTION FIELDS FOR TRANSFER DETECTION ===\n');
    console.log(`Found ${response.documents.length} transactions\n`);

    response.documents.forEach((doc, index) => {
      const raw = JSON.parse(doc.rawData);
      console.log(`\n--- Transaction ${index + 1} ---`);
      console.log('Name:', raw.name);
      console.log('Amount:', raw.amount);
      console.log('Category:', raw.category);
      console.log('Transaction Type:', raw.transaction_type);
      console.log('Payment Channel:', raw.payment_channel);

      if (raw.counterparties && raw.counterparties.length > 0) {
        console.log('Counterparties:', JSON.stringify(raw.counterparties, null, 2));
      }

      if (raw.personal_finance_category) {
        console.log('Personal Finance Category:', JSON.stringify(raw.personal_finance_category, null, 2));
      }

      // Check if this looks like a transfer
      const isTransfer = raw.transaction_type === 'transfer' ||
                        (raw.category && raw.category.includes('Transfer'));

      if (isTransfer) {
        console.log('*** POTENTIAL TRANSFER DETECTED ***');
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkTransferFields();
