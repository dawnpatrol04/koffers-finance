"use client";

import { useTransactionParams } from "@/hooks/use-transaction-params";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function TransactionDetails() {
  const { transactionId } = useTransactionParams();

  // Fetch transaction details from our API
  const { data, isLoading } = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: async () => {
      const response = await fetch(`/api/plaid/transactions/${transactionId}`);
      if (!response.ok) throw new Error("Failed to fetch transaction");
      return response.json();
    },
    enabled: Boolean(transactionId),
  });

  if (isLoading || !data) {
    return (
      <div className="h-[calc(100vh-80px)] scrollbar-hide overflow-auto pb-12">
        <Skeleton className="w-full h-[200px] mb-4" />
        <Skeleton className="w-full h-[100px] mb-4" />
        <Skeleton className="w-full h-[100px]" />
      </div>
    );
  }

  const transaction = data.transaction;

  return (
    <div className="h-[calc(100vh-80px)] scrollbar-hide overflow-auto pb-12">
      <div className="flex justify-between mb-8">
        <div className="flex-1 flex-col">
          <div className="flex items-center justify-between">
            {transaction.account_name && (
              <span className="text-[#606060] text-xs">{transaction.account_name}</span>
            )}
            <span className="text-[#606060] text-xs select-text">
              {transaction.date && format(new Date(transaction.date), "MMM d, y")}
            </span>
          </div>

          <h2 className="mt-6 mb-3 select-text text-xl font-semibold">
            {transaction.name || transaction.merchant_name || "Unknown Transaction"}
          </h2>

          <div className="flex justify-between items-center">
            <div className="flex flex-col w-full space-y-1">
              <span
                className={cn(
                  "text-4xl font-mono select-text",
                  transaction.amount < 0 && "text-[#00C969]", // Income is negative in Plaid
                )}
              >
                ${Math.abs(transaction.amount).toFixed(2)}
              </span>
              <span className="text-xs text-[#606060]">
                {transaction.amount < 0 ? "Income" : "Expense"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Merchant/Description */}
      {transaction.merchant_name && transaction.merchant_name !== transaction.name && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <Label className="text-xs text-muted-foreground">Merchant</Label>
            <p className="text-sm mt-1">{transaction.merchant_name}</p>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details */}
      <Card className="mb-4">
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Category</Label>
            <p className="text-sm mt-1">
              {transaction.category?.join(", ") || "Uncategorized"}
            </p>
          </div>

          {transaction.payment_channel && (
            <div>
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <p className="text-sm mt-1 capitalize">{transaction.payment_channel}</p>
            </div>
          )}

          {transaction.pending !== undefined && (
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <p className="text-sm mt-1">
                {transaction.pending ? "Pending" : "Posted"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction ID */}
      <Card>
        <CardContent className="pt-6">
          <Label className="text-xs text-muted-foreground">Transaction ID</Label>
          <p className="text-xs font-mono mt-1 text-muted-foreground select-text">
            {transaction.transaction_id}
          </p>
        </CardContent>
      </Card>

      {/* Future: Add more sections here */}
      {/* - Notes */}
      {/* - Attachments/Receipts */}
      {/* - Tags */}
      {/* - Custom categories */}
    </div>
  );
}
