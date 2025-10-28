"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';

interface Transaction {
  $id: string;
  amount: number;
  date: string;
}

export function BurnRateWidget() {
  const { user } = useUser();
  const [burnRate, setBurnRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchBurnRate = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/plaid/transactions?userId=${user.$id}&limit=100`);
        const data = await response.json();

        if (data.success) {
          // Calculate burn rate: average monthly spending over last 30 days
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

          const recentExpenses = data.transactions
            .filter((t: Transaction) => {
              const transactionDate = new Date(t.date);
              return t.amount > 0 && transactionDate >= thirtyDaysAgo;
            })
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

          setBurnRate(recentExpenses);
        }
      } catch (err) {
        console.error('Error fetching burn rate:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBurnRate();
  }, [user?.$id]);

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Burn Rate</h3>
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
      <h3 className="text-sm font-medium mb-4">Burn Rate</h3>
      <div className="h-[200px] flex flex-col items-center justify-center">
        <div className="text-4xl font-bold mb-2">
          ${burnRate.toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground">
          Last 30 Days
        </div>
      </div>
    </div>
  );
}
