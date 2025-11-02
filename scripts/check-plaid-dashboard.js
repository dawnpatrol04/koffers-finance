require('dotenv').config({ path: '.env.local' });
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

async function checkDashboard() {
  console.log('🔍 Checking Plaid Dashboard for existing Items...\n');
  console.log('Client ID:', process.env.PLAID_CLIENT_ID);
  console.log('Environment: sandbox\n');

  // Unfortunately, Plaid API doesn't have an endpoint to list all items
  // We need to know the access_token to query items

  console.log('❌ PROBLEM: Plaid API does not have an endpoint to list all Items');
  console.log('   without already having the access_token.\n');

  console.log('✅ SOLUTION: Check Plaid Dashboard manually:\n');
  console.log('   1. Go to: https://dashboard.plaid.com/');
  console.log('   2. Login with your credentials');
  console.log('   3. Navigate to: Team Settings > API');
  console.log('   4. Look for section: "Sandbox Test Items" or "Items"');
  console.log('   5. Search for user: 68feda5ccfd38390a7d7');
  console.log('   6. Or search by phone: +18505721741');
  console.log('   7. Or search by institution: Chase\n');

  console.log('   If you find the Item, you should see:');
  console.log('   - item_id');
  console.log('   - institution_name');
  console.log('   - created date');
  console.log('   - Maybe a way to get access_token (some dashboards show this)\n');
}

checkDashboard();
