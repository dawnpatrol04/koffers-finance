/**
 * Plaid API Client
 *
 * Server-side Plaid SDK client for bank connectivity.
 * Based on Midday's implementation with adaptations for Koffers.
 */

import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';

if (!process.env.PLAID_CLIENT_ID) {
  throw new Error('PLAID_CLIENT_ID environment variable is required');
}

if (!process.env.PLAID_SECRET) {
  throw new Error('PLAID_SECRET environment variable is required');
}

const PLAID_ENV = (process.env.NEXT_PUBLIC_PLAID_ENVIRONMENT ||'sandbox') as 'sandbox' | 'development' | 'production';

// Supported country codes (expand as needed)
const COUNTRY_CODES: CountryCode[] = [
  CountryCode.Us, // United States
  CountryCode.Ca, // Canada
  CountryCode.Gb, // United Kingdom
  CountryCode.De, // Germany
  CountryCode.Fr, // France
  CountryCode.Es, // Spain
  CountryCode.It, // Italy
  CountryCode.Nl, // Netherlands
];

// Initialize Plaid client configuration
const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

// Create and export Plaid API client
export const plaidClient = new PlaidApi(configuration);

// Export configuration constants
export const plaidConfig = {
  clientId: process.env.PLAID_CLIENT_ID,
  secret: process.env.PLAID_SECRET,
  environment: PLAID_ENV,
  countryCodes: COUNTRY_CODES,
  products: [Products.Transactions], // Add Auth, Identity, etc. as needed
  webhookUrl: `${process.env.NEXT_PUBLIC_URL}/api/webhook/plaid`,
};

/**
 * Generate webhook URL based on environment
 */
export function getWebhookUrl(): string {
  if (PLAID_ENV === 'sandbox' || PLAID_ENV === 'development') {
    // For local development, you might use ngrok or similar
    return process.env.PLAID_WEBHOOK_URL || `${process.env.NEXT_PUBLIC_URL}/api/webhook/plaid`;
  }

  // Production webhook URL
  return `${process.env.NEXT_PUBLIC_URL}/api/webhook/plaid`;
}
