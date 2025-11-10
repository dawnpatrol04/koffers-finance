"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlaidLink } from "@/components/plaid/plaid-link";
import { useUser } from "@/contexts/user-context";

interface PlaidAccount {
  $id: string;
  itemId: string;
  accountId: string;
  name: string;
  officialName: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  currentBalance: number;
  availableBalance: number | null;
  plaidItemDocId: string | null; // Appwrite document ID of the Plaid Item
}

interface PlaidItem {
  $id: string;
  itemId: string;
  institutionName: string | null;
  institutionId: string | null;
}

export function ConnectedAccounts() {
  const { user } = useUser();
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [items, setItems] = useState<Map<string, PlaidItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/plaid/accounts?userId=${user.$id}`);
        const data = await response.json();

        if (data.success) {
          setAccounts(data.accounts || []);

          // Build a map of item IDs to institution info
          const itemsMap = new Map<string, PlaidItem>();
          data.accounts?.forEach((account: PlaidAccount) => {
            if (!itemsMap.has(account.itemId)) {
              itemsMap.set(account.itemId, {
                $id: account.itemId,
                itemId: account.itemId,
                institutionName: null, // We'll need to fetch this separately or store it
                institutionId: null,
              });
            }
          });
          setItems(itemsMap);
        }
      } catch (err) {
        console.error('Error fetching accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user?.$id]);

  const handleDisconnect = async (plaidItemDocId: string) => {
    if (!user?.$id) return;

    if (!confirm('Are you sure you want to disconnect this bank account? This will remove all associated transactions.')) {
      return;
    }

    try {
      setDisconnecting(plaidItemDocId);
      const response = await fetch('/api/plaid/remove-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: plaidItemDocId, // This is the Appwrite document $id
          userId: user.$id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove accounts from state
        setAccounts((prev) => prev.filter((acc) => acc.plaidItemDocId !== plaidItemDocId));
        setItems((prev) => {
          const newItems = new Map(prev);
          // Remove by finding the key that matches
          for (const [key, value] of newItems.entries()) {
            if (value.$id === plaidItemDocId) {
              newItems.delete(key);
              break;
            }
          }
          return newItems;
        });
      } else {
        alert(`Error disconnecting account: ${data.error}`);
      }
    } catch (err: any) {
      console.error('Error disconnecting account:', err);
      alert(`Error disconnecting account: ${err.message}`);
    } finally {
      setDisconnecting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bank Accounts</CardTitle>
          <CardDescription>
            Manage bank accounts, update or connect new ones.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded-md"></div>
            <div className="h-16 bg-muted rounded-md"></div>
            <div className="h-16 bg-muted rounded-md"></div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button disabled>Connect Account</Button>
        </CardFooter>
      </Card>
    );
  }

  // Group accounts by institution
  const accountsByInstitution = new Map<string, PlaidAccount[]>();
  accounts.forEach((account) => {
    const existing = accountsByInstitution.get(account.itemId) || [];
    accountsByInstitution.set(account.itemId, [...existing, account]);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Accounts</CardTitle>
        <CardDescription>
          Manage bank accounts, update or connect new ones.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No bank accounts connected yet.
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(accountsByInstitution.entries()).map(([itemId, itemAccounts]) => (
              <div key={itemId} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">
                    {itemAccounts[0]?.officialName || itemAccounts[0]?.name || 'Bank Connection'}
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDisconnect(itemAccounts[0]?.plaidItemDocId || '')}
                    disabled={disconnecting === itemAccounts[0]?.plaidItemDocId}
                  >
                    {disconnecting === itemAccounts[0]?.plaidItemDocId ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </div>

                <div className="space-y-2">
                  {itemAccounts.map((account) => (
                    <div
                      key={account.$id}
                      className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md"
                    >
                      <div>
                        <div className="font-medium text-sm">{account.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.type}
                          {account.lastFour && ` • •••• ${account.lastFour}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${(account.currentBalance || 0).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end">
        <PlaidLink />
      </CardFooter>
    </Card>
  );
}
