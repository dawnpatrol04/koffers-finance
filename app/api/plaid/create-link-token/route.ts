import { NextRequest, NextResponse } from 'next/server';
import { getPlaidProducts, getCountryCodes } from '@/lib/plaid';

const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';
const PLAID_BASE_URL = PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : PLAID_ENV === 'development'
  ? 'https://development.plaid.com'
  : 'https://sandbox.plaid.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Make direct HTTP request to Plaid API to avoid SDK header issues on Vercel
    const plaidResponse = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
        'PLAID-SECRET': process.env.PLAID_SECRET || '',
      },
      body: JSON.stringify({
        user: {
          client_user_id: userId,
        },
        client_name: 'Koffers',
        products: getPlaidProducts(),
        country_codes: getCountryCodes(),
        language: 'en',
      }),
    });

    const data = await plaidResponse.json();

    if (!plaidResponse.ok) {
      console.error('Plaid API error:', data);
      return NextResponse.json({ error: data }, { status: plaidResponse.status });
    }

    return NextResponse.json({ link_token: data.link_token });
  } catch (error: any) {
    console.error('Error creating link token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create link token' },
      { status: 500 }
    );
  }
}
