import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Fetch accounts first to map account IDs to names
    const accountsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACCOUNTS,
      [Query.equal('userId', userId)]
    );

    const accountMap = new Map(
      accountsResponse.documents.map(acc => [
        acc.plaidAccountId,
        {
          name: acc.name,
          institution: acc.institution,
          type: acc.type,
          lastFour: acc.lastFour
        }
      ])
    );

    // Fetch recent transactions from the Plaid transactions collection
    // Note: Can't order by 'date' since it's inside rawData JSON
    // Using $createdAt instead for chronological ordering
    const transactionsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ]
    );

    // Format for frontend - parse rawData from each document
    const transactions = transactionsResponse.documents.map(doc => {
      const txnData = JSON.parse(doc.rawData);
      const accountInfo = accountMap.get(doc.plaidAccountId);

      return {
        $id: doc.$id,
        transactionId: doc.plaidTransactionId,
        accountId: doc.plaidAccountId,
        accountName: accountInfo?.name || 'Unknown Account',
        accountInstitution: accountInfo?.institution || '',
        accountType: accountInfo?.type || '',
        accountLastFour: accountInfo?.lastFour || '',
        date: txnData.date || txnData.authorized_date,
        name: txnData.name,
        merchantName: txnData.merchant_name || txnData.name,
        amount: txnData.amount,
        isoCurrencyCode: txnData.iso_currency_code || 'USD',
        pending: txnData.pending || false,
        category: JSON.stringify(txnData.category || ['Uncategorized']),
        paymentChannel: txnData.payment_channel || 'other',
        // Additional useful fields
        location: txnData.location || null,
        paymentMeta: txnData.payment_meta || null,
        transactionType: txnData.transaction_type || null,
        transactionCode: txnData.transaction_code || null,
      };
    });

    return NextResponse.json({
      success: true,
      transactions,
      total: transactionsResponse.total,
      hasMore: offset + limit < transactionsResponse.total
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
