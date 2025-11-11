"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';

interface Transaction {
  $id: string;
  rawData: string;
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

        // Use Appwrite SDK directly
        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc',
          'plaidTransactions',
          [Query.limit(1000)]
        );

        // Calculate burn rate: average monthly spending over last 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const recentExpenses = response.documents
          .filter((t: any) => {
            const data = JSON.parse(t.rawData);
            const transactionDate = new Date(data.date);
            const amount = data.amount || 0;
            return amount > 0 && transactionDate >= thirtyDaysAgo;
          })
          .reduce((sum: number, t: any) => {
            const data = JSON.parse(t.rawData);
            return sum + (data.amount || 0);
          }, 0);

        setBurnRate(recentExpenses);
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
