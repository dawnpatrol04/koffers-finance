import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import axios from 'axios';

// Create custom axios instance with interceptor
const axiosInstance = axios.create();

// Add request interceptor to inject credentials as headers
axiosInstance.interceptors.request.use((config) => {
  config.headers['PLAID-CLIENT-ID'] = process.env.PLAID_CLIENT_ID;
  config.headers['PLAID-SECRET'] = process.env.PLAID_SECRET;
  return config;
});

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
  baseOptions: {
    // Use custom axios instance with interceptor
    axios: axiosInstance,
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
