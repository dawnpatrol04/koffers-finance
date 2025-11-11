import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

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

    // Fetch ALL transactions for the user (we'll filter/sort in memory)
    // Note: Appwrite can't query inside rawData JSON, so we need to do this client-side
    const transactionsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      [
        Query.equal('userId', userId),
        Query.limit(5000) // Fetch all transactions (adjust if needed)
      ]
    );

    // Format and parse all transactions
    let transactions = transactionsResponse.documents.map(doc => {
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
        location: txnData.location || null,
        paymentMeta: txnData.payment_meta || null,
        transactionType: txnData.transaction_type || null,
        transactionCode: txnData.transaction_code || null,
      };
    });

    // Apply date range filter (default to last 365 days / 1 year if not specified)
    const now = new Date();
    const defaultDateFrom = new Date(now);
    defaultDateFrom.setDate(now.getDate() - 365);

    const filterDateFrom = dateFrom ? new Date(dateFrom) : defaultDateFrom;
    const filterDateTo = dateTo ? new Date(dateTo) : now;

    transactions = transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      return txnDate >= filterDateFrom && txnDate <= filterDateTo;
    });

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter(txn =>
        txn.merchantName.toLowerCase().includes(searchLower) ||
        txn.name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    transactions.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        comparison = dateB - dateA; // Default newest first
      } else if (sortBy === 'amount') {
        comparison = Math.abs(b.amount) - Math.abs(a.amount); // Largest first by default
      } else if (sortBy === 'merchant') {
        comparison = a.merchantName.localeCompare(b.merchantName); // A-Z by default
      }

      // Reverse if ascending order requested
      return sortOrder === 'asc' ? -comparison : comparison;
    });

    // Get total count after filtering
    const totalFiltered = transactions.length;

    // Apply pagination
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      transactions: paginatedTransactions,
      total: totalFiltered,
      hasMore: offset + limit < totalFiltered
    });

  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
