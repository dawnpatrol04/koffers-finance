import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, AxiosRequestConfig } from 'plaid';

// Initialize Plaid client with axios interceptor to add credentials
const plaidClientId = process.env.PLAID_CLIENT_ID!;
const plaidSecret = process.env.PLAID_SECRET!;

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    // Use axios interceptor to add credentials to request body
    transformRequest: [(data: any, headers: any) => {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return JSON.stringify({
        ...parsed,
        client_id: plaidClientId,
        secret: plaidSecret,
      });
    }],
  } as AxiosRequestConfig,
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
