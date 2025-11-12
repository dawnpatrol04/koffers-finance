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

        // Fetch all transactions to calculate historical net worth
        const transactionsResponse = await databases.listDocuments(
          DATABASE_ID,
          'plaidTransactions',
          [
            Query.equal('userId', user.$id),
            Query.limit(5000),
          ]
        );

        // Create a map of account ID to current balance
        const accountBalances = new Map<string, number>();
        accountsData.forEach(acc => {
          accountBalances.set(acc.$id, acc.currentBalance);
        });

        // Process transactions to calculate historical balances
        const transactions = transactionsResponse.documents.map((doc: any) => {
          const raw = JSON.parse(doc.rawData);
          return {
            date: raw.date,
            amount: raw.amount,
            accountId: doc.plaidAccountId,
          };
        });

        // Sort transactions by date (newest first)
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate historical net worth by month
        const monthlyNetWorth: Record<string, { assets: number; liabilities: number; netWorth: number }> = {};

        // Start with current balances for each account
        const historicalBalances = new Map<string, number>(accountBalances);

        // Work backwards through time
        transactions.forEach(txn => {
          const month = txn.date.substring(0, 7); // YYYY-MM

          // Update historical balance by reversing the transaction
          // (subtract the transaction amount to go back in time)
          const currentBal = historicalBalances.get(txn.accountId) || 0;
          historicalBalances.set(txn.accountId, currentBal - txn.amount);
        });

        // Now calculate net worth for each month going forward
        const sortedMonths: string[] = [];
        const monthBalances = new Map<string, Map<string, number>>();

        // Initialize with current balances for the most recent month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthBalances.set(currentMonth, new Map(accountBalances));
        sortedMonths.push(currentMonth);

        // Go back through transactions and calculate balance at end of each month
        transactions.reverse(); // Now oldest first

        const monthlyTxns: Record<string, any[]> = {};
        transactions.forEach(txn => {
          const month = txn.date.substring(0, 7);
          if (!monthlyTxns[month]) {
            monthlyTxns[month] = [];
          }
          monthlyTxns[month].push(txn);
        });

        // Calculate net worth for each month
        const months = Object.keys(monthlyTxns).sort();

        // Start from the oldest month and work forward
        const runningBalances = new Map<string, number>();

        // Initialize with zeros or earliest known balances
        accountsData.forEach(acc => {
          runningBalances.set(acc.$id, 0);
        });

        months.forEach(month => {
          // Apply this month's transactions
          monthlyTxns[month].forEach((txn: any) => {
            const currentBal = runningBalances.get(txn.accountId) || 0;
            runningBalances.set(txn.accountId, currentBal + txn.amount);
          });

          // Calculate net worth at end of month
          let monthAssets = 0;
          let monthLiabilities = 0;

          runningBalances.forEach((balance, accountId) => {
            if (balance > 0) {
              monthAssets += balance;
            } else if (balance < 0) {
              monthLiabilities += Math.abs(balance);
            }
          });

          monthlyNetWorth[month] = {
            assets: monthAssets,
            liabilities: monthLiabilities,
            netWorth: monthAssets - monthLiabilities,
          };
        });

        // Convert to array for chart
        const historyData = Object.keys(monthlyNetWorth)
          .sort()
          .map(month => ({
            date: month,
            ...monthlyNetWorth[month],
          }));

        setNetWorthHistory(historyData);

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

      {/* Net Worth Trend Over Time - Full Width */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Net Worth Trend Over Time</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Current Net Worth: <span className={`font-semibold ${netWorth >= 0 ? 'text-green-600' : 'text-red-600'}`}>${netWorth.toFixed(2)}</span></span>
          </div>
        </CardHeader>
        <CardContent>
          {netWorthHistory.length > 0 ? (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={netWorthHistory}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLiabilities" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="assets"
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorAssets)"
                    name="Assets"
                  />
                  <Area
                    type="monotone"
                    dataKey="liabilities"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorLiabilities)"
                    name="Liabilities"
                  />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorNetWorth)"
                    strokeWidth={3}
                    name="Net Worth"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No historical data available yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Net Worth - Hero Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Net Worth Breakdown</CardTitle>
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
