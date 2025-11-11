import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Fetch all accounts for this user
    const accountsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACCOUNTS,
      [Query.equal('userId', userId)]
    );

    // For each account, we need to get the Plaid Item's Appwrite document ID
    // The account has plaidItemId which is the Plaid item ID string (e.g., "item-123")
    // We need to look up the plaidItems collection to get the document $id, institution name, and connection date
    const accountsWithItemDocId = await Promise.all(
      accountsResponse.documents.map(async (account) => {
        // Get the Plaid Item document
        const itemsResponse = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.PLAID_ITEMS,
          [
            Query.equal('itemId', account.plaidItemId),
            Query.limit(1)
          ]
        );

        const plaidItem = itemsResponse.documents[0];

        return {
          ...account,
          plaidItemDocId: plaidItem?.$id || null,
          institutionName: plaidItem?.institutionName || null,
          connectedAt: plaidItem?.$createdAt || null
        };
      })
    );

    return NextResponse.json({
      success: true,
      accounts: accountsWithItemDocId,
      total: accountsResponse.total
    });

  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
