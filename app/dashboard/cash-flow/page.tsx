"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';
import { DATABASE_ID } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function CashFlowPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState<any>(null);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchCashFlowData = async () => {
      try {
        setLoading(true);

        // Fetch all transactions for the user
        const response = await databases.listDocuments(
          DATABASE_ID,
          'plaidTransactions',
          [
            Query.equal('userId', user.$id),
            Query.limit(5000), // Get all transactions
          ]
        );

        // Process transactions into cash flow data
        const transactions = response.documents.map((doc: any) => {
          const raw = JSON.parse(doc.rawData);
          return {
            date: raw.date,
            amount: raw.amount,
            name: raw.name,
            category: raw.category,
          };
        });

        // Sort by date
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Group by month and calculate net cash flow
        const monthlyData: Record<string, { income: number; expenses: number; net: number }> = {};

        transactions.forEach(txn => {
          const month = txn.date.substring(0, 7); // YYYY-MM

          if (!monthlyData[month]) {
            monthlyData[month] = { income: 0, expenses: 0, net: 0 };
          }

          // In Plaid: negative amounts = income, positive amounts = expenses
          if (txn.amount < 0) {
            monthlyData[month].income += Math.abs(txn.amount);
          } else {
            monthlyData[month].expenses += txn.amount;
          }

          monthlyData[month].net = monthlyData[month].income - monthlyData[month].expenses;
        });

        setCashFlowData(monthlyData);
      } catch (error) {
        console.error('Error fetching cash flow data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCashFlowData();
  }, [user?.$id]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <h1 className="text-3xl font-bold mb-8">Cash Flow Overview</h1>
        <Skeleton className="w-full h-[400px] mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="w-full h-[300px]" />
          <Skeleton className="w-full h-[300px]" />
        </div>
      </div>
    );
  }

  // Calculate totals
  const months = Object.keys(cashFlowData || {}).sort();
  const totalIncome = months.reduce((sum, month) => sum + (cashFlowData?.[month]?.income || 0), 0);
  const totalExpenses = months.reduce((sum, month) => sum + (cashFlowData?.[month]?.expenses || 0), 0);
  const netCashFlow = totalIncome - totalExpenses;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cash Flow Overview</h1>
        <p className="text-muted-foreground">
          Track your income, expenses, and net cash flow over time
        </p>
      </div>

      {/* Net Cash Flow Chart - Full Width */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Net Cash Flow Trend</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Total Income: <span className="text-green-600 font-semibold">${totalIncome.toFixed(2)}</span></span>
            <span>Total Expenses: <span className="text-red-600 font-semibold">${totalExpenses.toFixed(2)}</span></span>
            <span>Net: <span className={`font-semibold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>${netCashFlow.toFixed(2)}</span></span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={months.map(month => ({
                  month,
                  net: cashFlowData[month].net,
                  income: cashFlowData[month].income,
                  expenses: -cashFlowData[month].expenses, // Negative for visual clarity
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `$${Math.abs(value).toFixed(2)}`}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#8884d8"
                  strokeWidth={3}
                  name="Net Cash Flow"
                  dot={{ fill: '#8884d8', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Income"
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Expenses"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Income and Expenses Charts - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Income by Month</CardTitle>
            <div className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={months.map(month => ({
                    month,
                    income: cashFlowData[month].income,
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="income" fill="#22c55e" name="Income" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Month</CardTitle>
            <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={months.map(month => ({
                    month,
                    expenses: cashFlowData[month].expenses,
                  }))}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Month</th>
                  <th className="text-right py-2 px-4">Income</th>
                  <th className="text-right py-2 px-4">Expenses</th>
                  <th className="text-right py-2 px-4">Net</th>
                </tr>
              </thead>
              <tbody>
                {months.map(month => (
                  <tr key={month} className="border-b">
                    <td className="py-2 px-4">{month}</td>
                    <td className="text-right py-2 px-4 text-green-600">
                      ${cashFlowData[month].income.toFixed(2)}
                    </td>
                    <td className="text-right py-2 px-4 text-red-600">
                      ${cashFlowData[month].expenses.toFixed(2)}
                    </td>
                    <td className={`text-right py-2 px-4 font-semibold ${
                      cashFlowData[month].net >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${cashFlowData[month].net.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
