/**
 * POST /api/plaid/get-accounts
 *
 * Fetches the list of bank accounts from Plaid for a given connection.
 * Used after token exchange to let user select which accounts to sync.
 *
 * Request Body:
 * - accessToken: string - Plaid access token (plaintext, from exchange-token response)
 * - institutionId: string - Plaid institution ID (for fetching institution details)
 *
 * Response:
 * - accounts: Array of account objects with balances and metadata
 * - institution: Institution name and details
 */

import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken, institutionId } = body;

    // Validate required fields
    if (!accessToken) {
      return NextResponse.json(
        { error: 'accessToken is required' },
        { status: 400 }
      );
    }

    // Step 1: Fetch accounts from Plaid
    console.log('Fetching accounts from Plaid...');
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts;

    // Step 2: Fetch institution details (optional but useful)
    let institution = null;
    if (institutionId) {
      try {
        const institutionResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US', 'CA', 'GB', 'DE', 'FR', 'ES', 'IT', 'NL'] as any,
        });

        institution = {
          id: institutionResponse.data.institution.institution_id,
          name: institutionResponse.data.institution.name,
          logo: institutionResponse.data.institution.logo,
          primaryColor: institutionResponse.data.institution.primary_color,
          url: institutionResponse.data.institution.url,
        };
      } catch (error) {
        console.warn('Failed to fetch institution details:', error);
        // Continue without institution details
      }
    }

    // Step 3: Transform and return accounts
    const transformedAccounts = accounts.map((account) => ({
      accountId: account.account_id,
      name: account.name,
      officialName: account.official_name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      balances: {
        available: account.balances.available,
        current: account.balances.current,
        limit: account.balances.limit,
        currency: account.balances.iso_currency_code || account.balances.unofficial_currency_code,
      },
    }));

    return NextResponse.json({
      accounts: transformedAccounts,
      institution,
    });

  } catch (error: any) {
    console.error('Get accounts error:', error);

    // Handle Plaid-specific errors
    if (error.response?.data) {
      const plaidError = error.response.data;
      return NextResponse.json(
        {
          error: plaidError.error_message || 'Failed to fetch accounts',
          errorCode: plaidError.error_code,
          errorType: plaidError.error_type,
        },
        { status: error.response.status || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
