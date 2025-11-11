"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import { DATABASE_ID } from '@/lib/config';

interface Transaction {
  $id: string;
  rawData: string;
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

        // SECURITY: MUST filter by userId to prevent data leakage
        const response = await databases.listDocuments(
          DATABASE_ID,
          'plaidTransactions',
          [
            Query.equal('userId', user.$id),
            Query.limit(1000)
          ]
        );

        // Calculate total spending (positive amounts only = expenses)
        const spending = response.documents
          .filter((t: any) => {
            const data = JSON.parse(t.rawData);
            return (data.amount || 0) > 0;
          })
          .reduce((sum: number, t: any) => {
            const data = JSON.parse(t.rawData);
            return sum + (data.amount || 0);
          }, 0);

        setTotalSpending(spending);
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
