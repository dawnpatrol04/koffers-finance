import { NextRequest, NextResponse } from 'next/server';
import { plaidClient, getCountryCodes } from '@/lib/plaid';
import { DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite-config';
import { databases, createSessionClient } from '@/lib/appwrite-server';

export async function POST(request: NextRequest) {
  try {
    // Validate session and get userId securely
    const { account } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;

    const { public_token } = await request.json();

    if (!public_token) {
      return NextResponse.json(
        { error: 'public_token is required' },
        { status: 400 }
      );
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get institution info
    const itemResponse = await plaidClient.itemGet({
      access_token: accessToken,
    });

    const institutionId = itemResponse.data.item.institution_id || '';
    let institutionName = '';

    if (institutionId) {
      try {
        const institutionResponse = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: getCountryCodes(),
        });
        institutionName = institutionResponse.data.institution.name;
      } catch (error) {
        console.error('Error fetching institution details:', error);
      }
    }

    // Store in Appwrite
    const plaidItem = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_ITEMS,
      ID.unique(),
      {
        userId,
        itemId,
        accessToken,
        institutionId,
        institutionName,
        rawData: JSON.stringify(itemResponse.data),
        status: 'active'
      }
    );

    console.log('✅ Plaid item stored:', plaidItem.$id);

    return NextResponse.json({
      success: true,
      itemId: plaidItem.$id,
      institutionName,
    });

  } catch (error: any) {
    // Handle authentication errors
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error exchanging token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
