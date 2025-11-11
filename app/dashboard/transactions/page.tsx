"use client";

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useUser } from '@/contexts/user-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionCard } from '@/components/transaction-card';
import { TransactionSheet } from '@/components/sheets/transaction-sheet';
import { useTransactionParams } from '@/hooks/use-transaction-params';
import { Plus, Search, ArrowLeft, RefreshCw, ArrowUpDown } from 'lucide-react';
import type { Transaction } from '@/types/transaction';
import { databases } from '@/lib/appwrite-client';
import { Query } from 'appwrite';

interface ApiTransaction {
  $id: string;
  transactionId: string;
  accountId: string;
  accountName: string;
  accountInstitution: string;
  accountType: string;
  accountLastFour: string;
  date: string;
  name: string;
  merchantName: string;
  amount: number;
  isoCurrencyCode: string;
  pending: boolean;
  category: string;
  paymentChannel: string;
  location: any;
  paymentMeta: any;
  transactionType: string;
  transactionCode: string;
}

function TransactionsContent() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const { setParams } = useTransactionParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [dateRangePreset, setDateRangePreset] = useState('last30days');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Calculate date range based on preset
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRangePreset) {
      case 'last7days': {
        const from = new Date(today);
        from.setDate(from.getDate() - 7);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      }
      case 'last30days': {
        const from = new Date(today);
        from.setDate(from.getDate() - 30);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      }
      case 'last60days': {
        const from = new Date(today);
        from.setDate(from.getDate() - 60);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      }
      case 'last90days': {
        const from = new Date(today);
        from.setDate(from.getDate() - 90);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      }
      case 'ytd': {
        const from = new Date(now.getFullYear(), 0, 1);
        return { from: from.toISOString().split('T')[0], to: today.toISOString().split('T')[0] };
      }
      case 'custom':
        return { from: customDateFrom, to: customDateTo };
      default:
        return { from: '', to: '' };
    }
  };

  // Debounce search query (500ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch transactions when filters change
  useEffect(() => {
    if (userLoading) return;

    if (!user?.$id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);

        // Build Appwrite queries
        const queries = [Query.limit(100)];

        // Add search if provided
        if (debouncedSearch) {
          queries.push(Query.search('merchantName', debouncedSearch));
        }

        // Use Appwrite SDK directly - automatically filtered by user session
        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc',
          'plaidTransactions',
          queries
        );

        // Map API transactions to Transaction type
        const mappedTransactions: Transaction[] = response.documents.map((t: any) => {
            const data = JSON.parse(t.rawData);
            const displayCategory = data.personal_finance_category?.primary || 'Uncategorized';

            // Format date from YYYY-MM-DD to MM/DD/YYYY
            const formatDate = (dateString: string) => {
              try {
                const date = new Date(dateString);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
              } catch {
                return dateString; // fallback to original if parsing fails
              }
            };

            return {
              id: t.$id,
              date: formatDate(data.date || new Date().toISOString()),
              merchant: data.merchant_name || data.name || 'Unknown',
              merchantSubtext: data.name || '',
              amount: data.amount || 0,
              category: displayCategory,
              channel: data.payment_channel || 'Other',
              status: data.pending ? 'pending' : 'completed',
              hasReceipt: false,
              hasCommentary: false,
              isReviewed: false,
              hasTags: false,
              hasReminder: false,
            } as Transaction;
          });

          setTransactions(mappedTransactions);
          setHasMore(response.total > response.documents.length);
          setTotal(response.total);
          setError(null);
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.$id, userLoading, sortBy, sortOrder, debouncedSearch, dateRangePreset, customDateFrom, customDateTo]);

  const loadMoreTransactions = async () => {
    if (!user?.$id || loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);

      // Build Appwrite queries with offset
      const queries = [
        Query.limit(100),
        Query.offset(transactions.length)
      ];

      // Add search if provided
      if (debouncedSearch) {
        queries.push(Query.search('merchantName', debouncedSearch));
      }

      const response = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc',
        'plaidTransactions',
        queries
      );

      const mappedTransactions: Transaction[] = response.documents.map((t: any) => {
          const data = JSON.parse(t.rawData);
          const displayCategory = data.personal_finance_category?.primary || 'Uncategorized';

          const formatDate = (dateString: string) => {
            try {
              const date = new Date(dateString);
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const year = date.getFullYear();
              return `${month}/${day}/${year}`;
            } catch {
              return dateString;
            }
          };

          return {
            id: t.$id,
            date: formatDate(data.date || new Date().toISOString()),
            merchant: data.merchant_name || data.name || 'Unknown',
            merchantSubtext: data.name || '',
            amount: data.amount || 0,
            category: displayCategory,
            channel: data.payment_channel || 'Other',
            status: data.pending ? 'pending' : 'completed',
            hasReceipt: false,
            hasCommentary: false,
            isReviewed: false,
            hasTags: false,
            hasReminder: false,
          } as Transaction;
        });

        setTransactions(prev => [...prev, ...mappedTransactions]);
        setHasMore(response.total > transactions.length + response.documents.length);
    } catch (err: any) {
      console.error('Error loading more transactions:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    if (!user?.$id) return;

    try {
      setRefreshing(true);
      setError(null);

      // Call the fetch-data endpoint to refresh from Plaid
      const response = await fetch(`/api/plaid/fetch-data?userId=${user.$id}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        // Refetch transactions to get the latest using Appwrite SDK
        const txnResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc',
          'plaidTransactions',
          [Query.limit(100)]
        );

        const mappedTransactions: Transaction[] = txnResponse.documents.map((t: any) => {
            const data = JSON.parse(t.rawData);
            const displayCategory = data.personal_finance_category?.primary || 'Uncategorized';

            const formatDate = (dateString: string) => {
              try {
                const date = new Date(dateString);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = date.getFullYear();
                return `${month}/${day}/${year}`;
              } catch {
                return dateString;
              }
            };

            return {
              id: t.$id,
              date: formatDate(data.date || new Date().toISOString()),
              merchant: data.merchant_name || data.name || 'Unknown',
              merchantSubtext: data.name || '',
              amount: data.amount || 0,
              category: displayCategory,
              channel: data.payment_channel || 'Other',
              status: data.pending ? 'pending' : 'completed',
              hasReceipt: false,
              hasCommentary: false,
              isReviewed: false,
              hasTags: false,
              hasReminder: false,
            } as Transaction;
          });

          setTransactions(mappedTransactions);
      } else {
        setError(data.error || 'Failed to refresh transactions');
      }
    } catch (err: any) {
      console.error('Error refreshing transactions:', err);
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Client-side filter for income/expenses/pending only
  // Search and sorting are handled server-side
  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'income') return transaction.amount < 0;
    if (filter === 'expenses') return transaction.amount > 0;
    if (filter === 'pending') return transaction.status === 'pending';
    return true; // 'all'
  });

  // Transactions are already sorted by the server
  const sortedTransactions = filteredTransactions;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-4xl font-bold">Transactions</h1>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse border border-border rounded-lg p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-4xl font-bold">Transactions</h1>
          <div className="border border-border rounded-lg p-6 text-center">
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Transactions</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {sortedTransactions.length} of {total} transactions
            </span>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
              All
            </Button>
            <Button variant={filter === "income" ? "default" : "outline"} onClick={() => setFilter("income")}>
              Income
            </Button>
            <Button
              variant={filter === "expenses" ? "default" : "outline"}
              onClick={() => setFilter("expenses")}
            >
              Expenses
            </Button>
            <Button variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
              Pending
            </Button>
          </div>

          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="amount">Sort by Amount</SelectItem>
                <SelectItem value="merchant">Sort by Merchant</SelectItem>
                <SelectItem value="completion">Sort by Completion</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="text-sm font-medium">Date Range:</span>
          <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="last60days">Last 60 Days</SelectItem>
              <SelectItem value="last90days">Last 90 Days</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {dateRangePreset === 'custom' && (
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="w-[150px]"
                placeholder="From"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="w-[150px]"
                placeholder="To"
              />
            </div>
          )}
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {sortedTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onClick={(id) => setParams({ transactionId: id })}
              onUploadReceipt={(id) => console.log("Upload receipt for", id)}
              onAddCommentary={(id) => console.log("Add commentary for", id)}
              onMarkReviewed={(id) => console.log("Mark reviewed", id)}
              onAddTag={(id) => console.log("Add tag for", id)}
              onAddReminder={(id) => console.log("Add reminder for", id)}
            />
          ))}

          {sortedTransactions.length === 0 && (
            <div className="border border-border rounded-lg p-12 text-center">
              <p className="text-muted-foreground">No transactions found matching your filters</p>
            </div>
          )}
        </div>

        {/* Load More Button */}
        {hasMore && sortedTransactions.length > 0 && (
          <div className="flex justify-center pt-6">
            <Button
              variant="outline"
              size="lg"
              onClick={loadMoreTransactions}
              disabled={loadingMore}
              className="min-w-[200px]"
            >
              {loadingMore ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Load More
                  <span className="ml-2 text-muted-foreground">
                    ({total - transactions.length} remaining)
                  </span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Transaction Detail Sheet */}
      <TransactionSheet />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-6">Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
