"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';

interface Transaction {
  $id: string;
  amount: number;
  date: string;
  category: string;
}

export function SpendingWidget() {
  const { user } = useUser();
  const [totalSpending, setTotalSpending] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchSpending = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/plaid/transactions?userId=${user.$id}&limit=100`);
        const data = await response.json();

        if (data.success) {
          // Calculate total spending (positive amounts only = expenses)
          const spending = data.transactions
            .filter((t: Transaction) => t.amount > 0)
            .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

          setTotalSpending(spending);
        }
      } catch (err) {
        console.error('Error fetching spending:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpending();
  }, [user?.$id]);

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Spending</h3>
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
      <h3 className="text-sm font-medium mb-4">Spending</h3>
      <div className="h-[200px] flex flex-col items-center justify-center">
        <div className="text-4xl font-bold mb-2">
          ${totalSpending.toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground">
          Total Expenses
        </div>
      </div>
    </div>
  );
}
