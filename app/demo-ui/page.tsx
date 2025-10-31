"use client";

import { cn } from "@/lib/utils";

export default function DemoUIPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Transaction List - Subtle Indicators</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Subtle badges showing missing receipt/context, condensed items when available
          </p>
        </div>

        {/* Transaction Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-800">
              <tr className="text-sm text-gray-500 dark:text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Merchant</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Example 1: Empty - no receipt, no context */}
              <TransactionRow
                date="10/27/2025"
                status="Pending"
                merchantPrimary="TST* BETTER BUZZ PB GRAND"
                merchantSecondary="TST* BETTER BUZZ PB GRAND"
                category="Uncategorized"
                type="Other"
                amount={-3.49}
                hasReceipt={false}
                hasContext={false}
                hasItems={false}
              />

              {/* Example 2: Empty - no receipt, no context */}
              <TransactionRow
                date="10/27/2025"
                merchantPrimary="Trader Joe's"
                merchantSecondary="Trader Joe's"
                category="Uncategorized"
                type="Other"
                amount={-28.03}
                hasReceipt={false}
                hasContext={false}
                hasItems={false}
              />

              {/* Example 3: Has receipt only - no context yet */}
              <TransactionRow
                date="10/27/2025"
                status="Pending"
                merchantPrimary="VONS FUEL4627"
                merchantSecondary="VONS FUEL4627"
                category="Uncategorized"
                type="Other"
                amount={-41.56}
                hasReceipt={true}
                hasContext={false}
                hasItems={false}
              />

              {/* Example 4: Has receipt + context + items */}
              <TransactionRow
                date="10/27/2025"
                merchantPrimary="Vons"
                merchantSecondary="Vons"
                category="Groceries"
                type="Other"
                amount={-26.54}
                hasReceipt={true}
                hasContext={true}
                hasItems={true}
                context="Weekly groceries"
                items={[
                  { name: "Organic Milk", price: 5.99 },
                  { name: "Bread", price: 3.49 },
                  { name: "Eggs", price: 4.29 },
                  { name: "Bananas", price: 2.15 },
                  { name: "Coffee", price: 10.62 },
                ]}
              />

              {/* Example 5: Has context only - no receipt */}
              <TransactionRow
                date="10/26/2025"
                merchantPrimary="Uber"
                merchantSecondary="Uber Trip"
                category="Transportation"
                type="Other"
                amount={-15.23}
                hasReceipt={false}
                hasContext={true}
                hasItems={false}
                context="Ride to airport for business trip"
              />

              {/* Example 6: Empty */}
              <TransactionRow
                date="10/26/2025"
                merchantPrimary="Shell Gas Station"
                merchantSecondary="Shell #4627"
                category="Auto & Transport"
                type="Other"
                amount={-45.00}
                hasReceipt={false}
                hasContext={false}
                hasItems={false}
              />
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-sm mb-2">Legend:</h3>
          <div className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                No receipt
              </span>
              <span>- Grey badge = missing receipt</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                No context
              </span>
              <span>- Grey badge = missing context/notes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                📄
              </span>
              <span>- Green = receipt attached</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                💬
              </span>
              <span>- Blue = context/notes added</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-600 dark:text-purple-400 text-sm">• • •</span>
              <span>- Purple dots = items extracted (shows condensed item list)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionRow({
  date,
  status,
  merchantPrimary,
  merchantSecondary,
  category,
  type,
  amount,
  hasReceipt,
  hasContext,
  hasItems,
  context,
  items,
}: {
  date: string;
  status?: string;
  merchantPrimary: string;
  merchantSecondary: string;
  category: string;
  type: string;
  amount: number;
  hasReceipt: boolean;
  hasContext: boolean;
  hasItems: boolean;
  context?: string;
  items?: Array<{ name: string; price: number }>;
}) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <div className="text-sm">{date}</div>
        {status && (
          <div className="text-xs text-orange-600 dark:text-orange-400">{status}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          <div className="font-medium text-sm">{merchantPrimary}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{merchantSecondary}</div>

          {/* Badges - subtle, inline */}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {!hasReceipt && (
              <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                No receipt
              </span>
            )}
            {!hasContext && (
              <span className="px-2 py-0.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                No context
              </span>
            )}
            {hasReceipt && (
              <span className="px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                📄
              </span>
            )}
            {hasContext && (
              <span className="px-2 py-0.5 rounded text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                💬
              </span>
            )}
          </div>

          {/* Context text - if exists */}
          {hasContext && context && (
            <div className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">
              "{context}"
            </div>
          )}

          {/* Items - condensed list with dots */}
          {hasItems && items && (
            <div className="mt-2 text-xs space-y-0.5">
              <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                <span>• • •</span>
                <span>{items.length} items</span>
              </div>
              <div className="pl-3 space-y-0.5 text-gray-600 dark:text-gray-400">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.name}</span>
                    <span className="text-gray-500 dark:text-gray-500">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">{category}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">{type}</div>
      </td>
      <td className="px-4 py-3 text-right">
        <div className={cn(
          "text-sm font-medium",
          amount < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
        )}>
          {amount < 0 ? '-' : ''}${Math.abs(amount).toFixed(2)}
        </div>
      </td>
    </tr>
  );
}
