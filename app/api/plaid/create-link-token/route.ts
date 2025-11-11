import { NextRequest, NextResponse } from 'next/server';
import { getPlaidProducts, getCountryCodes } from '@/lib/plaid';
import { validateSession } from '@/lib/auth-helpers';

// PRODUCTION ONLY - No sandbox
const PLAID_BASE_URL = 'https://production.plaid.com';

export async function POST(request: NextRequest) {
  try {
    // Validate session and get userId securely
    const { userId } = await validateSession();

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
        transactions: {
          days_requested: 730, // Request 24 months (730 days) of transaction history
        },
      }),
    });

    const data = await plaidResponse.json();

    if (!plaidResponse.ok) {
      console.error('Plaid API error:', data);
      return NextResponse.json({ error: data }, { status: plaidResponse.status });
    }

    return NextResponse.json({ link_token: data.link_token });
  } catch (error: any) {
    // Handle authentication errors
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error creating link token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create link token' },
      { status: 500 }
    );
  }
}
