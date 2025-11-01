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

    // Fetch recent transactions from plaidTransactions staging area
    const plaidTransactionsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      [
        Query.equal('userId', userId),
        Query.limit(limit)
      ]
    );

    // Parse raw Plaid data into transaction format
    const transactions = plaidTransactionsResponse.documents.map(doc => {
      const rawData = JSON.parse(doc.rawData);
      return {
        $id: doc.$id,
        transactionId: rawData.transaction_id,
        date: rawData.date,
        name: rawData.name,
        merchantName: rawData.merchant_name || rawData.name,
        amount: rawData.amount,
        isoCurrencyCode: rawData.iso_currency_code,
        pending: rawData.pending,
        category: JSON.stringify(rawData.category || []),
      };
    });

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      transactions,
      total: plaidTransactionsResponse.total
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
