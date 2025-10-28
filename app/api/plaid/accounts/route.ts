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
      COLLECTIONS.PLAID_ACCOUNTS,
      [Query.equal('userId', userId)]
    );

    return NextResponse.json({
      success: true,
      accounts: accountsResponse.documents,
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
