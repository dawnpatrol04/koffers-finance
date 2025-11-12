"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import { DATABASE_ID } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Account {
  $id: string;
  name: string;
  type: string;
  currentBalance: number;
  institution: string;
  lastFour: string;
}

export default function NetWorthPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [netWorthHistory, setNetWorthHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchNetWorthData = async () => {
      try {
        setLoading(true);

        // Fetch all accounts for the user
        const accountsResponse = await databases.listDocuments(
          DATABASE_ID,
          'accounts',
          [
            Query.equal('userId', user.$id),
            Query.limit(100),
          ]
        );

        const accountsData = accountsResponse.documents as unknown as Account[];
        setAccounts(accountsData);

        // For now, we'll use current balances
        // In the future, we can track historical balances
        const currentDate = new Date().toISOString().split('T')[0];
        const totalAssets = accountsData
          .filter(acc => acc.currentBalance > 0)
          .reduce((sum, acc) => sum + acc.currentBalance, 0);

        const totalLiabilities = Math.abs(accountsData
          .filter(acc => acc.currentBalance < 0)
          .reduce((sum, acc) => sum + acc.currentBalance, 0));

        // Create a simple history (in future, fetch actual historical data)
        setNetWorthHistory([
          {
            date: currentDate,
            assets: totalAssets,
            liabilities: totalLiabilities,
            netWorth: totalAssets - totalLiabilities,
          }
        ]);

      } catch (error) {
        console.error('Error fetching net worth data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNetWorthData();
  }, [user?.$id]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">Net Worth Overview</h1>
        <Skeleton className="w-full h-[400px] mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="w-full h-[300px]" />
          <Skeleton className="w-full h-[300px]" />
        </div>
      </div>
    );
  }

  // Calculate current net worth
  const assets = accounts.filter(acc => acc.currentBalance > 0);
  const liabilities = accounts.filter(acc => acc.currentBalance < 0);

  const totalAssets = assets.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalLiabilities = Math.abs(liabilities.reduce((sum, acc) => sum + acc.currentBalance, 0));
  const netWorth = totalAssets - totalLiabilities;

  // Prepare data for pie charts
  const assetsData = assets.map(acc => ({
    name: acc.name,
    value: acc.currentBalance,
    institution: acc.institution,
  }));

  const liabilitiesData = liabilities.map(acc => ({
    name: acc.name,
    value: Math.abs(acc.currentBalance),
    institution: acc.institution,
  }));

  const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Net Worth Overview</h1>
        <p className="text-muted-foreground">
          Track your total assets, liabilities, and net worth
        </p>
      </div>

      {/* Current Net Worth - Hero Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Net Worth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Total Assets</div>
              <div className="text-4xl font-bold text-green-600">${totalAssets.toFixed(2)}</div>
            </div>
            <div className="text-center p-6 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Total Liabilities</div>
              <div className="text-4xl font-bold text-red-600">${totalLiabilities.toFixed(2)}</div>
            </div>
            <div className="text-center p-6 bg-primary/10 rounded-lg border-2 border-primary">
              <div className="text-sm text-muted-foreground mb-2">Net Worth</div>
              <div className={`text-5xl font-bold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${netWorth.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets and Liabilities Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Assets Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Assets Breakdown</CardTitle>
            <div className="text-2xl font-bold text-green-600">${totalAssets.toFixed(2)}</div>
          </CardHeader>
          <CardContent>
            {assetsData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {assetsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No assets found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Liabilities Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Liabilities Breakdown</CardTitle>
            <div className="text-2xl font-bold text-red-600">${totalLiabilities.toFixed(2)}</div>
          </CardHeader>
          <CardContent>
            {liabilitiesData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={liabilitiesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: $${entry.value.toFixed(0)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {liabilitiesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No liabilities found
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounts Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Assets */}
            {assets.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-600">Assets</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Account</th>
                        <th className="text-left py-2 px-4">Institution</th>
                        <th className="text-left py-2 px-4">Type</th>
                        <th className="text-right py-2 px-4">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map(account => (
                        <tr key={account.$id} className="border-b">
                          <td className="py-2 px-4">{account.name}</td>
                          <td className="py-2 px-4">{account.institution}</td>
                          <td className="py-2 px-4 capitalize">{account.type}</td>
                          <td className="text-right py-2 px-4 font-semibold text-green-600">
                            ${account.currentBalance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Liabilities */}
            {liabilities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-red-600">Liabilities</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Account</th>
                        <th className="text-left py-2 px-4">Institution</th>
                        <th className="text-left py-2 px-4">Type</th>
                        <th className="text-right py-2 px-4">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liabilities.map(account => (
                        <tr key={account.$id} className="border-b">
                          <td className="py-2 px-4">{account.name}</td>
                          <td className="py-2 px-4">{account.institution}</td>
                          <td className="py-2 px-4 capitalize">{account.type}</td>
                          <td className="text-right py-2 px-4 font-semibold text-red-600">
                            ${Math.abs(account.currentBalance).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
