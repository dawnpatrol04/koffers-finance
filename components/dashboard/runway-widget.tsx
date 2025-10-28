"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';

interface Transaction {
  $id: string;
  amount: number;
  date: string;
}

interface Account {
  $id: string;
  currentBalance: number;
}

export function RunwayWidget() {
  const { user } = useUser();
  const [runway, setRunway] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchRunway = async () => {
      try {
        setLoading(true);

        // Fetch both accounts and transactions
        const [accountsRes, transactionsRes] = await Promise.all([
          fetch(`/api/plaid/accounts?userId=${user.$id}`),
          fetch(`/api/plaid/transactions?userId=${user.$id}&limit=100`)
        ]);

        const accountsData = await accountsRes.json();
        const transactionsData = await transactionsRes.json();

        if (accountsData.success && transactionsData.success) {
          // Calculate total balance
          const totalBalance = accountsData.accounts
            .reduce((sum: number, account: Account) => sum + (account.currentBalance || 0), 0);

          // Calculate monthly burn rate (last 30 days)
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          const monthlyExpenses = transactionsData.transactions
            .filter((t: Transaction) => {
              const transactionDate = new Date(t.date);
              return t.amount > 0 && transactionDate >= thirtyDaysAgo;
            })
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

          // Calculate runway in months
          const runwayMonths = monthlyExpenses > 0 ? totalBalance / monthlyExpenses : 0;
          setRunway(runwayMonths);
        }
      } catch (err) {
        console.error('Error fetching runway:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRunway();
  }, [user?.$id]);

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Runway</h3>
        <div className="h-[200px] flex items-center justify-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-32 mb-2"></div>
            <div className="h-4 bg-muted rounded w-24"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-6">
      <h3 className="text-sm font-medium mb-4">Runway</h3>
      <div className="h-[200px] flex flex-col items-center justify-center">
        <div className="text-4xl font-bold mb-2">
          {runway.toFixed(1)}
        </div>
        <div className="text-sm text-muted-foreground">
          Months
        </div>
        {runway < 3 && runway > 0 && (
          <div className="mt-2 text-xs text-yellow-600">
            Low runway warning
          </div>
        )}
      </div>
    </div>
  );
}
