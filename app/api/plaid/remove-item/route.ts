import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { databases, createSessionClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    // Validate session and get userId securely
    const { account } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;

    const body = await request.json();
    const { itemId, deleteTransactions = false } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 }
      );
    }

    // Get the Plaid Item from our database by document ID
    // itemId here is the Appwrite document $id
    const plaidItem = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_ITEMS,
      itemId
    );

    // Verify it belongs to this user (from session)
    if (plaidItem.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized - This item does not belong to you' },
        { status: 403 }
      );
    }
    const accessToken = plaidItem.accessToken;

    // Remove the Item from Plaid
    await plaidClient.itemRemove({
      access_token: accessToken,
    });

    // Delete all associated accounts from our database
    // Note: accounts.plaidItemId stores item.itemId (the Plaid item ID string), not the Appwrite doc ID
    const accounts = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACCOUNTS,
      [
        Query.equal('plaidItemId', plaidItem.itemId),
        Query.limit(100)
      ]
    );

    for (const account of accounts.documents) {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.ACCOUNTS,
        account.$id
      );
    }

    // Delete all associated transactions from our database (only if user requested it)
    // Note: transactions.plaidItemId stores plaidItem.$id (the Appwrite doc ID)
    if (deleteTransactions) {
      const transactions = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAID_TRANSACTIONS,
        [
          Query.equal('plaidItemId', plaidItem.$id),
          Query.limit(5000) // May need pagination for large datasets
        ]
      );

      for (const transaction of transactions.documents) {
        await databases.deleteDocument(
          DATABASE_ID,
          COLLECTIONS.PLAID_TRANSACTIONS,
          transaction.$id
        );
      }
    }

    // Delete the Plaid Item from our database
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_ITEMS,
      plaidItem.$id
    );

    return NextResponse.json({
      success: true,
      message: 'Bank connection removed successfully'
    });

  } catch (error: any) {
    // Handle authentication errors
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Error removing Plaid item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove bank connection' },
      { status: 500 }
    );
  }
}
