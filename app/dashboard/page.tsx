"use client";

import { PlaidLink } from "@/components/plaid/plaid-link";
import { TransactionsWidget } from "@/components/dashboard/transactions-widget";
import { AccountsWidget } from "@/components/dashboard/accounts-widget";
import { SpendingWidget } from "@/components/dashboard/spending-widget";
import { BurnRateWidget } from "@/components/dashboard/burn-rate-widget";
import { RunwayWidget } from "@/components/dashboard/runway-widget";

export default function DashboardPage() {
  return (
    <div>
      {/* Chart Section - matches Midday's h-[530px] structure */}
      <div className="h-[530px] mb-4">
        {/* Chart Selectors Placeholder */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm border border-border rounded-md hover:bg-accent">
              Revenue
            </button>
            <button className="px-3 py-1 text-sm border border-border rounded-md hover:bg-accent">
              Profit
            </button>
            <button className="px-3 py-1 text-sm border border-border rounded-md hover:bg-accent">
              Burn Rate
            </button>
          </div>

          <PlaidLink />
        </div>

        {/* Charts Placeholder */}
        <div className="mt-8 relative">
          <div className="border border-border rounded-lg h-[400px] flex items-center justify-center bg-muted/5">
            <p className="text-muted-foreground">Chart visualization will appear here</p>
          </div>
        </div>
      </div>

      {/* Widgets Section - matches Midday's structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Accounts Widget */}
        <AccountsWidget />

        {/* Spending Widget */}
        <SpendingWidget />

        {/* Burn Rate Widget */}
        <BurnRateWidget />

        {/* Runway Widget */}
        <RunwayWidget />

        {/* Inbox Widget */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Inbox</h3>
          <div className="h-[200px] flex items-center justify-center bg-muted/5 rounded-md">
            <p className="text-sm text-muted-foreground">Recent documents</p>
          </div>
        </div>

        {/* Transactions Widget */}
        <TransactionsWidget />

        {/* Invoices Widget */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Invoices</h3>
          <div className="h-[200px] flex items-center justify-center bg-muted/5 rounded-md">
            <p className="text-sm text-muted-foreground">Invoice status</p>
          </div>
        </div>
      </div>
    </div>
  );
}
