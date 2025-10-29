"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Transaction {
  $id: string;
  transactionId: string;
  date: string;
  name: string;
  merchantName: string;
  amount: number;
  isoCurrencyCode: string;
  pending: boolean;
  category: string;
  paymentChannel: string;
}

export default function TransactionsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    if (!user?.$id) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/plaid/transactions?userId=${user.$id}&limit=100`);
        const data = await response.json();

        if (data.success) {
          setTransactions(data.transactions);
        } else {
          setError(data.error || 'Failed to fetch transactions');
        }
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.$id]);

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    if (filter === 'income') return transaction.amount < 0;
    if (filter === 'expense') return transaction.amount > 0;
    if (filter === 'pending') return transaction.pending;
    return true;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === 'amount') {
      return Math.abs(b.amount) - Math.abs(a.amount);
    }
    if (sortBy === 'name') {
      return a.merchantName.localeCompare(b.merchantName);
    }
    return 0;
  });

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">Transactions</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="animate-pulse border border-border rounded-lg p-4">
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
      <div className="p-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">Transactions</h1>
        <div className="border border-border rounded-lg p-6 text-center">
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-bold mb-6">Transactions</h1>
        <div className="border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground mb-4">No transactions found</p>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">
            Connect a bank account to get started
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="text-sm text-muted-foreground">
          {sortedTransactions.length} transactions
        </div>
      </div>

      {/* Filters and Sort */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm border rounded-md ${
              filter === 'all' ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`px-3 py-1 text-sm border rounded-md ${
              filter === 'income' ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`px-3 py-1 text-sm border rounded-md ${
              filter === 'expense' ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1 text-sm border rounded-md ${
              filter === 'pending' ? 'bg-primary text-primary-foreground' : 'border-border hover:bg-accent'
            }`}
          >
            Pending
          </button>
        </div>

        <div className="ml-auto flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1 text-sm border border-border rounded-md bg-background"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left p-4 text-sm font-medium">Date</th>
              <th className="text-left p-4 text-sm font-medium">Merchant</th>
              <th className="text-left p-4 text-sm font-medium">Category</th>
              <th className="text-left p-4 text-sm font-medium">Channel</th>
              <th className="text-right p-4 text-sm font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((transaction) => {
              const categories = transaction.category ? JSON.parse(transaction.category) : [];
              const displayCategory = categories.length > 0 ? categories[0] : 'Uncategorized';

              return (
                <tr
                  key={transaction.$id}
                  onClick={() => router.push(`/dashboard/transactions?transactionId=${transaction.transactionId}`)}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                >
                  <td className="p-4 text-sm">
                    <div>{new Date(transaction.date).toLocaleDateString()}</div>
                    {transaction.pending && (
                      <span className="text-xs text-yellow-600">Pending</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium">{transaction.merchantName}</div>
                    <div className="text-xs text-muted-foreground">{transaction.name}</div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{displayCategory}</td>
                  <td className="p-4 text-sm text-muted-foreground capitalize">{transaction.paymentChannel}</td>
                  <td className="p-4 text-right">
                    <span className={`text-sm font-medium ${transaction.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount < 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
