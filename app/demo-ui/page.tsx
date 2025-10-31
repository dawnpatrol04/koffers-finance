"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export default function DemoUIPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Transaction Card - Simplified Outlines</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Core concept: 2 outlines (Receipt + Context), Items outline appears only when receipt exists
          </p>
        </div>

        {/* Examples */}
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Complete Transaction</h2>
            <p className="text-sm text-gray-500 mb-4">Has receipt + items + context</p>
            <TransactionCard
              transaction={{
                merchantName: "Starbucks",
                amount: 8.08,
                date: "Oct 29, 2025",
                hasReceipt: true,
                hasContext: true,
                hasItems: true,
                context: "Coffee meeting with Sarah about Q4 budget",
                itemCount: 3,
              }}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Receipt, No Items Yet</h2>
            <p className="text-sm text-gray-500 mb-4">Receipt uploaded but items not extracted</p>
            <TransactionCard
              transaction={{
                merchantName: "Target",
                amount: 23.45,
                date: "Oct 28, 2025",
                hasReceipt: true,
                hasContext: false,
                hasItems: false,
              }}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Context Only</h2>
            <p className="text-sm text-gray-500 mb-4">User added note but no receipt</p>
            <TransactionCard
              transaction={{
                merchantName: "Uber",
                amount: 15.23,
                date: "Oct 27, 2025",
                hasReceipt: false,
                hasContext: true,
                hasItems: false,
                context: "Ride to airport",
              }}
            />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Empty Transaction</h2>
            <p className="text-sm text-gray-500 mb-4">Just the transaction, nothing added yet</p>
            <TransactionCard
              transaction={{
                merchantName: "Shell Gas Station",
                amount: 45.0,
                date: "Oct 30, 2025",
                hasReceipt: false,
                hasContext: false,
                hasItems: false,
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function TransactionCard({ transaction }: { transaction: any }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow">
      {/* Transaction Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg">{transaction.merchantName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.date}</p>
        </div>
        <span className="font-semibold text-lg">${transaction.amount.toFixed(2)}</span>
      </div>

      {/* Outlines/Slots */}
      <div className="space-y-2">
        {/* Receipt Outline - Always visible */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-3 transition-all",
            transaction.hasReceipt
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          )}
        >
          <div className="flex items-center gap-2">
            {transaction.hasReceipt ? (
              <>
                <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Receipt attached
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl">📄</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No receipt
                </span>
              </>
            )}
          </div>
        </div>

        {/* Context Outline - Always visible */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-3 transition-all",
            transaction.hasContext
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
          )}
        >
          <div className="flex items-start gap-2">
            {transaction.hasContext ? (
              <>
                <span className="text-blue-600 dark:text-blue-400 text-xl flex-shrink-0">✓</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Context
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                    "{transaction.context}"
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="text-2xl flex-shrink-0">💬</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                  No context
                </span>
              </>
            )}
          </div>
        </div>

        {/* Items Outline - Only shows if receipt exists */}
        {transaction.hasReceipt && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-3 transition-all",
              transaction.hasItems
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 ring-2 ring-purple-200 dark:ring-purple-800"
                : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            )}
          >
            <div className="flex items-center gap-2">
              {transaction.hasItems ? (
                <>
                  <span className="text-purple-600 dark:text-purple-400 text-xl">✓</span>
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {transaction.itemCount} items extracted
                  </span>
                  <span className="ml-auto text-xs px-2 py-1 rounded bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-medium">
                    ITEMS
                  </span>
                </>
              ) : (
                <>
                  <span className="text-2xl">🏷️</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                    Items not extracted yet
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
