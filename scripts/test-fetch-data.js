require('dotenv').config({ path: '.env.local' });

async function testFetchData() {
  // You'll need to provide the actual userId from the test account
  const userId = '6720e4670033333ada96'; // Update this

  try {
    const response = await fetch('http://localhost:3000/api/plaid/fetch-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testFetchData();
