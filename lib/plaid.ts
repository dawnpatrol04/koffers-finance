import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
});

export const plaidClient = new PlaidApi(configuration);

// Export credentials for use in API calls
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
