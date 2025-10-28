import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, plaidClientId, plaidSecret } from '@/lib/plaid';
import { createServerClient } from '@/lib/appwrite-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { public_token, userId } = body;

    if (!public_token || !userId) {
      return NextResponse.json(
        { error: 'public_token and userId are required' },
        { status: 400 }
      );
    }

    // Exchange public token for access token
    const response = await plaidClient.itemPublicTokenExchange({
      client_id: plaidClientId,
      secret: plaidSecret,
      public_token,
    });

    const { access_token, item_id } = response.data;

    // TODO: Store access_token and item_id in Appwrite database
    // For now, just return them
    console.log('Access token received for user:', userId);
    console.log('Item ID:', item_id);

    return NextResponse.json({
      success: true,
      access_token,
      item_id,
    });
  } catch (error) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
