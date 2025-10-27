/**
 * POST /api/plaid/create-link-token
 *
 * Creates a Plaid Link token for initializing the Plaid Link modal.
 * Link tokens are ephemeral (valid for 4 hours) and single-use.
 *
 * Request Body:
 * - userId: string - Current user's ID
 * - accessToken?: string - Optional: for update/reconnect mode
 *
 * Response:
 * - linkToken: string - Token to initialize Plaid Link
 * - expiration: string - ISO 8601 timestamp when token expires
 */

import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, plaidConfig, getWebhookUrl } from '@/lib/plaid-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, accessToken, language = 'en' } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Create link token request
    const request = {
      user: {
        client_user_id: userId,
      },
      client_name: 'Koffers',
      products: plaidConfig.products,
      country_codes: plaidConfig.countryCodes,
      language,
      webhook: getWebhookUrl(),
      transactions: {
        days_requested: 730, // Request 2 years of transaction history
      },
    };

    // If accessToken is provided, this is an update/reconnect flow
    if (accessToken) {
      Object.assign(request, { access_token: accessToken });
    }

    // Call Plaid API
    const response = await plaidClient.linkTokenCreate(request);

    // Return link token to client
    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
      requestId: response.data.request_id,
    });

  } catch (error: any) {
    console.error('Create link token error:', error);

    // Handle Plaid-specific errors
    if (error.response?.data) {
      const plaidError = error.response.data;
      return NextResponse.json(
        {
          error: plaidError.error_message || 'Failed to create link token',
          errorCode: plaidError.error_code,
          errorType: plaidError.error_type,
        },
        { status: error.response.status || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
