"use client";

import { PlaidLink } from "@/components/plaid/plaid-link";

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
        {/* Spending Widget */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Spending</h3>
          <div className="h-[200px] flex items-center justify-center bg-muted/5 rounded-md">
            <p className="text-sm text-muted-foreground">Spending chart</p>
          </div>
        </div>

        {/* Burn Rate Widget */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Burn Rate</h3>
          <div className="h-[200px] flex items-center justify-center bg-muted/5 rounded-md">
            <p className="text-sm text-muted-foreground">Burn rate metrics</p>
          </div>
        </div>

        {/* Runway Widget */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Runway</h3>
          <div className="h-[200px] flex items-center justify-center bg-muted/5 rounded-md">
            <p className="text-sm text-muted-foreground">Runway projection</p>
          </div>
        </div>

        {/* Inbox Widget */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Inbox</h3>
          <div className="h-[200px] flex items-center justify-center bg-muted/5 rounded-md">
            <p className="text-sm text-muted-foreground">Recent documents</p>
          </div>
        </div>

        {/* Transactions Widget */}
        <div className="border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium mb-4">Recent Transactions</h3>
          <div className="h-[200px] flex items-center justify-center bg-muted/5 rounded-md">
            <p className="text-sm text-muted-foreground">Transaction list</p>
          </div>
        </div>

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
