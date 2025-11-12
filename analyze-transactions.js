// Quick script to analyze a sample transaction from the database
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('67099a0800067cbb5d52')
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function analyzeSample() {
  try {
    // Get a few transactions to analyze
    const response = await databases.listDocuments(
      '670ef42800075d9f3ba4',
      'plaidTransactions',
      [
        Query.equal('userId', '6723569c001a33dfa5f2'),
        Query.limit(10)
      ]
    );

    console.log(`\nFound ${response.documents.length} transactions`);
    
    // Print first transaction's full rawData to see what fields Plaid provides
    if (response.documents.length > 0) {
      const firstTxn = response.documents[0];
      const rawData = JSON.parse(firstTxn.rawData);
      
      console.log('\n=== SAMPLE TRANSACTION STRUCTURE ===');
      console.log(JSON.stringify(rawData, null, 2));
      
      console.log('\n=== KEY FIELDS FOR TRANSFER DETECTION ===');
      console.log('transaction_type:', rawData.transaction_type);
      console.log('category:', rawData.category);
      console.log('payment_channel:', rawData.payment_channel);
      console.log('counterparties:', rawData.counterparties);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyzeSample();
