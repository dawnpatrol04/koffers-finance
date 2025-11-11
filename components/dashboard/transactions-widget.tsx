"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import Link from 'next/link';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import { DATABASE_ID } from '@/lib/config';

interface Transaction {
  $id: string;
  rawData: string;
  plaidTransactionId: string;
}

export function TransactionsWidget() {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);

        // Use Appwrite SDK directly - automatically filtered by user session
        const response = await databases.listDocuments(
          DATABASE_ID,
          'plaidTransactions',
          [Query.limit(5)]
        );

        setTransactions(response.documents as any[]);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.$id]);

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Recent Transactions</h3>
        <div className="text-sm text-muted-foreground">
          {error}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Recent Transactions</h3>
        <div className="text-sm text-muted-foreground">
          No transactions found. Connect a bank account to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Recent Transactions</h3>
        <Link href="/dashboard/transactions" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {transactions.map((transaction) => {
          const data = JSON.parse(transaction.rawData);
          const category = data.personal_finance_category?.primary || 'Uncategorized';
          const merchantName = data.merchant_name || data.name || 'Unknown';
          const amount = data.amount || 0;
          const date = data.date || new Date().toISOString();

          return (
            <div key={transaction.$id} className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm font-medium">{merchantName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {category} • {new Date(date).toLocaleDateString()}
                </div>
              </div>
              <div className={`text-sm font-medium ${amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {amount < 0 ? '+' : '-'}${Math.abs(amount).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
