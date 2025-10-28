import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, getPlaidProducts, getCountryCodes } from '@/lib/plaid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: 'Koffers',
      products: getPlaidProducts(),
      country_codes: getCountryCodes(),
      language: 'en',
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (error: any) {
    console.error('Error creating link token:', error);
    console.error('Plaid error response:', error.response?.data);
    return NextResponse.json(
      { error: error.response?.data || error.message || 'Failed to create link token' },
      { status: 500 }
    );
  }
}
