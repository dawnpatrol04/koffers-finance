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

    // Fetch all accounts for total balance
    const accountsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ACCOUNTS,
      [Query.equal('userId', userId)]
    );

    // Calculate total balance
    const totalBalance = accountsResponse.documents.reduce((sum, account) => {
      return sum + (account.currentBalance || 0);
    }, 0);

    const accountsCount = accountsResponse.total;

    // Fetch all transactions for this user
    const transactionsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      [
        Query.equal('userId', userId),
        Query.limit(5000) // Get all transactions for calculations
      ]
    );

    const transactions = transactionsResponse.documents;
    const transactionsCount = transactions.length;

    // Get current month date range
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate this month's spending and income
    let spendingThisMonth = 0;
    let incomeThisMonth = 0;
    const categoryTotals: Record<string, number> = {};

    transactions.forEach(doc => {
      const txnData = JSON.parse(doc.rawData);
      const txnDate = new Date(txnData.date || txnData.authorized_date);
      const amount = txnData.amount;

      // Only include transactions from this month
      if (txnDate >= firstDayOfMonth && txnDate <= lastDayOfMonth) {
        if (amount > 0) {
          spendingThisMonth += amount;
        } else {
          incomeThisMonth += Math.abs(amount);
        }
      }

      // Track category totals (all time)
      const categories = txnData.category || ['Uncategorized'];
      const categoryName = Array.isArray(categories) ? categories[0] : 'Uncategorized';

      if (amount > 0) { // Only count expenses for category breakdown
        categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + amount;
      }
    });

    // Get top 5 spending categories
    const topSpendingCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount: parseFloat(amount.toFixed(2))
      }));

    return NextResponse.json({
      success: true,
      data: {
        totalBalance: parseFloat(totalBalance.toFixed(2)),
        accountsCount,
        transactionsCount,
        spendingThisMonth: parseFloat(spendingThisMonth.toFixed(2)),
        incomeThisMonth: parseFloat(incomeThisMonth.toFixed(2)),
        topSpendingCategories
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' // Cache for 5 minutes
      }
    });

  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
