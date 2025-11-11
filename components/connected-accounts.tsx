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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { PlaidLink } from "@/components/plaid/plaid-link";
import { useUser } from "@/contexts/user-context";
import { databases } from "@/lib/appwrite-client";

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
  institutionName: string | null; // Institution name from Plaid Item
  connectedAt: string | null; // Connection date from Plaid Item
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTransactions, setDeleteTransactions] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user?.$id) return;

    const fetchAccounts = async () => {
      try {
        setLoading(true);

        // Use Appwrite SDK directly
        const response = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'koffers_poc',
          'accounts'
        );

        setAccounts(response.documents as any[] || []);

        // Build a map of item IDs to institution info
        const itemsMap = new Map<string, PlaidItem>();
        response.documents?.forEach((account: any) => {
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
      } catch (err) {
        console.error('Error fetching accounts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user?.$id]);

  const openDisconnectDialog = (plaidItemDocId: string, institutionName: string) => {
    setItemToDelete({ id: plaidItemDocId, name: institutionName });
    setDeleteTransactions(false); // Reset checkbox
    setDialogOpen(true);
  };

  const confirmDisconnect = async () => {
    if (!user?.$id || !itemToDelete) return;

    try {
      setDisconnecting(itemToDelete.id);
      setDialogOpen(false);

      const response = await fetch('/api/plaid/remove-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: itemToDelete.id, // This is the Appwrite document $id
          userId: user.$id,
          deleteTransactions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove accounts from state
        setAccounts((prev) => prev.filter((acc) => acc.plaidItemDocId !== itemToDelete.id));
        setItems((prev) => {
          const newItems = new Map(prev);
          // Remove by finding the key that matches
          for (const [key, value] of newItems.entries()) {
            if (value.$id === itemToDelete.id) {
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
      setItemToDelete(null);
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

  // Group accounts by Plaid Item (each connection is a separate item)
  // Use plaidItemDocId instead of itemId to properly separate duplicate connections
  const accountsByInstitution = new Map<string, PlaidAccount[]>();
  accounts.forEach((account) => {
    const key = account.plaidItemDocId || account.itemId; // Fallback to itemId if plaidItemDocId is null
    const existing = accountsByInstitution.get(key) || [];
    accountsByInstitution.set(key, [...existing, account]);
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
            {Array.from(accountsByInstitution.entries()).map(([itemId, itemAccounts]) => {
              const firstAccount = itemAccounts[0];
              const institutionName = firstAccount?.institutionName || 'Bank Connection';
              const connectedDate = firstAccount?.connectedAt
                ? new Date(firstAccount.connectedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : '';

              return (
                <div key={itemId} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{institutionName}</h4>
                      {connectedDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Connected on {connectedDate}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDisconnectDialog(firstAccount?.plaidItemDocId || '', institutionName)}
                      disabled={disconnecting === firstAccount?.plaidItemDocId}
                    >
                      {disconnecting === firstAccount?.plaidItemDocId ? 'Disconnecting...' : 'Disconnect'}
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
              );
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end">
        <PlaidLink />
      </CardFooter>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Bank Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect <strong>{itemToDelete?.name}</strong>?
              This will remove the connection and all associated accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center space-x-2 py-4">
            <Checkbox
              id="delete-transactions"
              checked={deleteTransactions}
              onCheckedChange={(checked) => setDeleteTransactions(checked as boolean)}
            />
            <label
              htmlFor="delete-transactions"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Also delete all transactions from this account
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDisconnect}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
