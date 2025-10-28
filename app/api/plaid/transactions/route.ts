import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Fetch recent transactions for this user
    const transactionsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      [
        Query.equal('userId', userId),
        Query.orderDesc('date'),
        Query.limit(limit)
      ]
    );

    return NextResponse.json({
      success: true,
      transactions: transactionsResponse.documents,
      total: transactionsResponse.total
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
