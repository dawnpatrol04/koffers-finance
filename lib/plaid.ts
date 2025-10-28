import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

// Initialize Plaid client
// Note: Plaid SDK v39+ uses axios internally which requires credentials in request body, not headers
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
});

export const plaidClient = new PlaidApi(configuration);

// Export credentials to be used in API requests
export const plaidClientId = process.env.PLAID_CLIENT_ID!;
export const plaidSecret = process.env.PLAID_SECRET!;

// Helper to get products array
export const getPlaidProducts = (): Products[] => {
  const products = ['transactions', 'auth', 'balance'];
  return products as Products[];
};

// Helper to get country codes
export const getCountryCodes = (): CountryCode[] => {
  return ['US'] as CountryCode[];
};
