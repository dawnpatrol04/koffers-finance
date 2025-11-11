"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';

interface Transaction {
  $id: string;
  rawData: string;
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

        // Fetch both accounts and transactions using Appwrite SDK
        const [accountsRes, transactionsRes] = await Promise.all([
          databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc',
            'accounts'
          ),
          databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc',
            'plaidTransactions',
            [Query.limit(1000)]
          )
        ]);

        // Calculate total balance
        const totalBalance = accountsRes.documents
          .reduce((sum: number, account: any) => sum + (account.currentBalance || 0), 0);

        // Calculate monthly burn rate (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const monthlyExpenses = transactionsRes.documents
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

        // Calculate runway in months
        const runwayMonths = monthlyExpenses > 0 ? totalBalance / monthlyExpenses : 0;
        setRunway(runwayMonths);
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
