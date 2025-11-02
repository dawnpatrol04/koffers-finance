"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TransactionCard } from '@/components/transaction-card';
import { Plus, Search, ArrowLeft } from 'lucide-react';
import type { Transaction } from '@/types/transaction';

interface ApiTransaction {
  $id: string;
  transactionId: string;
  date: string;
  name: string;
  merchantName: string;
  amount: number;
  isoCurrencyCode: string;
  pending: boolean;
  category: string;
  paymentChannel: string;
}

export default function TransactionsPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

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
        const response = await fetch(`/api/plaid/transactions?userId=${user.$id}&limit=100`);
        const data = await response.json();

        if (data.success) {
          // Map API transactions to Transaction type
          const mappedTransactions: Transaction[] = data.transactions.map((t: ApiTransaction) => {
            const categories = t.category ? JSON.parse(t.category) : [];
            const displayCategory = categories.length > 0 ? categories[0] : 'Uncategorized';

            return {
              id: t.$id,
              date: t.date,
              merchant: t.merchantName,
              merchantSubtext: t.name,
              amount: t.amount,
              category: displayCategory,
              channel: t.paymentChannel || 'Other',
              status: t.pending ? 'pending' : 'completed',
              hasReceipt: false,
              hasCommentary: false,
              isReviewed: false,
              hasTags: false,
              hasReminder: false,
            } as Transaction;
          });

          setTransactions(mappedTransactions);
        } else {
          setError(data.error || 'Failed to fetch transactions');
        }
      } catch (err: any) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user?.$id, userLoading]);

  const filteredTransactions = transactions.filter(transaction => {
    let typeMatch = true;
    if (filter === 'income') typeMatch = transaction.amount < 0;
    else if (filter === 'expenses') typeMatch = transaction.amount > 0;
    else if (filter === 'pending') typeMatch = transaction.status === 'pending';

    let searchMatch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      searchMatch =
        transaction.merchant.toLowerCase().includes(query) ||
        (transaction.merchantSubtext && transaction.merchantSubtext.toLowerCase().includes(query));
    }

    return typeMatch && searchMatch;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === 'amount') {
      return Math.abs(b.amount) - Math.abs(a.amount);
    }
    if (sortBy === 'merchant') {
      return a.merchant.localeCompare(b.merchant);
    }
    if (sortBy === 'completion') {
      const aComplete = a.hasReceipt && a.hasCommentary;
      const bComplete = b.hasReceipt && b.hasCommentary;
      return aComplete === bComplete ? 0 : aComplete ? 1 : -1;
    }
    return 0;
  });

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
            <span className="text-sm text-muted-foreground">{sortedTransactions.length} transactions</span>
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
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {sortedTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
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
      </div>
    </div>
  );
}
