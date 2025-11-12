/**
 * Transactions Business Logic
 * Shared between Chat AI tools and MCP server
 *
 * NOTE: This includes the complex search logic that took 15 rounds to perfect!
 */

import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { databases } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import type { Transaction, TransactionSearchParams, TransactionSearchResult } from './types';

/**
 * Parse transaction from Appwrite document
 * Handles rawData JSON parsing safely
 */
function parseTransaction(doc: any): Transaction | null {
  try {
    const rawData = JSON.parse(doc.rawData);
    return {
      id: doc.$id,
      plaidTransactionId: doc.plaidTransactionId,
      accountId: doc.plaidAccountId,
      date: rawData.date || rawData.authorized_date,
      name: rawData.name || rawData.merchant_name,
      merchantName: rawData.merchant_name || rawData.name,
      amount: rawData.amount,
      currency: 'USD',
      category: rawData.category ? rawData.category.join(', ') : 'Uncategorized',
      pending: rawData.pending || false,
      paymentChannel: rawData.payment_channel,
    };
  } catch (e) {
    console.error('Error parsing transaction rawData:', e);
    return null;
  }
}

/**
 * Get recent transactions with optional filtering
 * @param userId - The user's ID
 * @param params - Filter parameters
 * @returns Array of transactions
 */
export async function getTransactions(
  userId: string,
  params: TransactionSearchParams = {}
): Promise<Transaction[]> {
  const {
    limit = 50,
    accountId,
    category,
    dateFrom,
    dateTo,
  } = params;

  // Build Appwrite queries
  const queries = [
    Query.equal('userId', userId),
    Query.limit(Math.min(limit, 500)),
    Query.orderDesc('$createdAt'),
  ];

  if (accountId) {
    queries.push(Query.equal('plaidAccountId', accountId));
  }

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PLAID_TRANSACTIONS,
    queries
  );

  // Parse and filter transactions
  let transactions = response.documents
    .map(parseTransaction)
    .filter((txn): txn is Transaction => txn !== null);

  // Apply date filters (in memory since date is in rawData JSON)
  if (dateFrom) {
    transactions = transactions.filter((txn) => txn.date >= dateFrom);
  }
  if (dateTo) {
    transactions = transactions.filter((txn) => txn.date <= dateTo);
  }

  // Apply category filter
  if (category) {
    transactions = transactions.filter((txn) =>
      txn.category.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Sort by date descending
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  return transactions.slice(0, limit);
}

/**
 * Search transactions by amount, date range, and merchant
 * This is the complex search logic that took 15 rounds to perfect!
 *
 * @param userId - The user's ID
 * @param amount - Transaction amount to search for
 * @param dateFrom - Start date (ISO format)
 * @param dateTo - End date (ISO format)
 * @param merchant - Optional merchant name filter
 * @returns Array of matching transactions with hasReceipt flag
 */
export async function searchTransactions(
  userId: string,
  amount: number,
  dateFrom: string,
  dateTo: string,
  merchant?: string
): Promise<TransactionSearchResult[]> {
  // Fetch all transactions (we filter in memory since date/amount are in rawData JSON)
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PLAID_TRANSACTIONS,
    [
      Query.equal('userId', userId),
      Query.limit(5000), // Get enough to search through
    ]
  );

  // Filter by date, amount (with tolerance), and optionally merchant
  const filtered = response.documents
    .filter((txn: any) => {
      try {
        const rawData = JSON.parse(txn.rawData);
        const txnDate = rawData.date || rawData.authorized_date;
        const txnAmount = Math.abs(rawData.amount);

        // Date range check
        const dateMatch = txnDate >= dateFrom && txnDate <= dateTo;

        // Amount check (within 1 cent tolerance)
        const amountMatch = Math.abs(txnAmount - amount) < 0.01;

        // Merchant check (optional, case-insensitive partial match)
        const merchantName = rawData.merchant_name || rawData.name || '';
        const merchantMatch =
          !merchant || merchantName.toLowerCase().includes(merchant.toLowerCase());

        return dateMatch && amountMatch && merchantMatch;
      } catch (e) {
        console.error('Error parsing transaction in search:', e);
        return false;
      }
    });

  // Check which transactions have linked receipts
  const txnIds = filtered.map((txn: any) => txn.$id);
  const filesForTxns =
    txnIds.length > 0
      ? await databases.listDocuments(DATABASE_ID, COLLECTIONS.FILES, [
          Query.equal('userId', userId),
          Query.isNotNull('transactionId'),
          Query.limit(1000),
        ])
      : { documents: [] };

  // Create map of transactionId -> has receipt
  const txnHasReceipt = new Map<string, boolean>();
  filesForTxns.documents.forEach((file: any) => {
    if (file.transactionId) {
      txnHasReceipt.set(file.transactionId, true);
    }
  });

  // Map to result format with hasReceipt flag
  return filtered.map((txn: any) => {
    const rawData = JSON.parse(txn.rawData);
    return {
      id: txn.$id,
      plaidTransactionId: txn.plaidTransactionId,
      accountId: txn.plaidAccountId,
      date: rawData.date || rawData.authorized_date,
      name: rawData.name,
      merchantName: rawData.merchant_name || rawData.name,
      amount: Math.abs(rawData.amount),
      currency: 'USD',
      category: rawData.category ? rawData.category.join(', ') : 'Uncategorized',
      pending: rawData.pending || false,
      hasReceipt: txnHasReceipt.get(txn.$id) || false,
    };
  });
}

/**
 * Get spending summary by category for a date range
 * @param userId - The user's ID
 * @param startDate - Start date (ISO format, defaults to 30 days ago)
 * @param endDate - End date (ISO format, defaults to today)
 * @returns Spending summary with category breakdown
 */
export async function getSpendingSummary(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const summaryEndDate = endDate || new Date().toISOString().split('T')[0];
  const summaryStartDate =
    startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Get all transactions for user
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PLAID_TRANSACTIONS,
    [Query.equal('userId', userId), Query.limit(5000)]
  );

  // Parse, filter by date, and group by category
  const categoryTotals: Record<string, number> = {};
  let totalSpending = 0;

  response.documents.forEach((doc: any) => {
    try {
      const txn = JSON.parse(doc.rawData);
      const txnDate = txn.date || txn.authorized_date;

      // Filter by date range
      if (txnDate >= summaryStartDate && txnDate <= summaryEndDate) {
        if (txn.amount > 0) {
          // Only count expenses (positive amounts in Plaid)
          const category = txn.category ? txn.category.join(', ') : 'Uncategorized';
          categoryTotals[category] = (categoryTotals[category] || 0) + txn.amount;
          totalSpending += txn.amount;
        }
      }
    } catch (e) {
      console.error('Error parsing transaction rawData:', e);
    }
  });

  return {
    period: { startDate: summaryStartDate, endDate: summaryEndDate },
    totalSpending,
    categories: Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(2) + '%' : '0%',
      }))
      .sort((a, b) => b.amount - a.amount),
  };
}
