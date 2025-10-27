/**
 * POST /api/plaid/exchange-token
 *
 * Exchanges a Plaid public_token for an access_token and saves the connection to Appwrite.
 * Public tokens are ephemeral (valid for 30 minutes) and single-use.
 * Access tokens are permanent and stored encrypted in the database.
 *
 * Request Body:
 * - publicToken: string - Public token from Plaid Link onSuccess callback
 * - institutionId: string - Plaid institution ID
 * - teamId: string - User's team ID
 *
 * Response:
 * - accessToken: string - For immediately fetching accounts (not stored client-side)
 * - itemId: string - Plaid item ID
 * - connectionId: string - Appwrite document ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { ID } from 'node-appwrite';
import { plaidClient } from '@/lib/plaid-client';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { encrypt } from '@/lib/encryption';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { publicToken, institutionId, teamId } = body;

    // Validate required fields
    if (!publicToken) {
      return NextResponse.json(
        { error: 'publicToken is required' },
        { status: 400 }
      );
    }

    if (!institutionId) {
      return NextResponse.json(
        { error: 'institutionId is required' },
        { status: 400 }
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      );
    }

    // Step 1: Exchange public token for access token
    console.log('Exchanging public token for access token...');
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Step 2: Encrypt the access token before storing
    const encryptedAccessToken = encrypt(access_token);

    // Step 3: Save to Appwrite
    console.log('Saving connection to Appwrite...');
    const connection = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.BANK_CONNECTIONS,
      ID.unique(),
      {
        team_id: teamId,
        institution_id: institutionId,
        item_id: item_id,
        access_token: encryptedAccessToken,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    console.log('Connection saved:', connection.$id);

    // Return access token (plaintext, NOT encrypted) for immediate use
    // Frontend will use this to fetch accounts, but won't store it
    return NextResponse.json({
      accessToken: access_token,
      itemId: item_id,
      connectionId: connection.$id,
      institutionId,
    });

  } catch (error: any) {
    console.error('Exchange token error:', error);

    // Handle Plaid-specific errors
    if (error.response?.data) {
      const plaidError = error.response.data;
      return NextResponse.json(
        {
          error: plaidError.error_message || 'Failed to exchange token',
          errorCode: plaidError.error_code,
          errorType: plaidError.error_type,
        },
        { status: error.response.status || 500 }
      );
    }

    // Handle Appwrite errors
    if (error.code) {
      return NextResponse.json(
        {
          error: 'Failed to save connection to database',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
