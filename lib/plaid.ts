import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Plaid SDK configuration - PRODUCTION ONLY
// Based on official docs: https://github.com/plaid/plaid-node
const configuration = new Configuration({
  basePath: PlaidEnvironments.production,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
      'PLAID-SECRET': process.env.PLAID_SECRET || '',
      'Plaid-Version': '2020-09-14', // Required API version header
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Helper to get products array
export const getPlaidProducts = () => {
  return ['transactions'] as const;
};

// Helper to get country codes
export const getCountryCodes = () => {
  return ['US'] as const;
};
