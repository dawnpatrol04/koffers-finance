"use client";

import { useTransactionParams } from "@/hooks/use-transaction-params";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  accountId: z.string().min(1, "Account is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function TransactionCreateForm() {
  const queryClient = useQueryClient();
  const { setParams } = useTransactionParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's bank accounts
  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const response = await fetch("/api/plaid/accounts");
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
  });

  const accounts = accountsData?.accounts || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      amount: "",
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
      accountId: accounts[0]?.account_id || "",
    },
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create transaction");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate transactions query to refetch
      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      // Close the sheet
      setParams(null);

      // Reset form
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Failed to create transaction:", error);
      alert(`Failed to create transaction: ${error.message}`);
    },
  });

  const onSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    createTransactionMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g., Coffee at Starbucks"
                  autoComplete="off"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="font-mono"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input {...field} type="date" max={new Date().toISOString().split("T")[0]} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select account</option>
                  {accounts.map((account: any) => (
                    <option key={account.account_id} value={account.account_id}>
                      {account.name} ({account.mask ? `****${account.mask}` : ""})
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="fixed bottom-8 w-full sm:max-w-[455px] right-8">
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || createTransactionMutation.isPending}
          >
            {isSubmitting || createTransactionMutation.isPending
              ? "Creating..."
              : "Create Transaction"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
