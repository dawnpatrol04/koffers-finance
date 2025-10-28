import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

// Initialize Plaid client with credentials
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Helper to get products array
export const getPlaidProducts = (): Products[] => {
  const products = ['transactions', 'auth', 'balance'];
  return products as Products[];
};

// Helper to get country codes
export const getCountryCodes = (): CountryCode[] => {
  return ['US'] as CountryCode[];
};
