"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/user-context';

interface Account {
  $id: string;
  accountId: string;
  name: string;
  officialName: string;
  type: string;
  subtype: string;
  mask: string;
  currentBalance: number;
  availableBalance: number;
  isoCurrencyCode: string;
}

export function AccountsWidget() {
  const { user } = useUser();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/plaid/accounts?userId=${user.$id}`);
        const data = await response.json();

        if (data.success) {
          setAccounts(data.accounts);
        } else {
          setError(data.error || 'Failed to fetch accounts');
        }
      } catch (err: any) {
        console.error('Error fetching accounts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user?.$id]);

  const totalBalance = accounts.reduce((sum, account) => sum + (account.currentBalance || 0), 0);

  if (loading) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Accounts Overview</h3>
        <div className="space-y-3">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Accounts Overview</h3>
        <div className="text-sm text-muted-foreground">
          {error}
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium mb-4">Accounts Overview</h3>
        <div className="text-sm text-muted-foreground">
          No accounts found. Connect a bank account to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-6">
      <h3 className="text-sm font-medium mb-4">Accounts Overview</h3>

      {/* Total Balance */}
      <div className="mb-6">
        <div className="text-3xl font-bold">${totalBalance.toFixed(2)}</div>
        <div className="text-xs text-muted-foreground mt-1">Total Balance</div>
      </div>

      {/* Account List */}
      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.$id} className="flex justify-between items-center pb-3 border-b border-border last:border-0">
            <div className="flex-1">
              <div className="text-sm font-medium">{account.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {account.subtype} • •••• {account.mask}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">${account.currentBalance.toFixed(2)}</div>
              {account.availableBalance !== account.currentBalance && (
                <div className="text-xs text-muted-foreground">
                  ${account.availableBalance.toFixed(2)} available
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
