"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export default function DemoUIPage() {
  const [selectedVariant, setSelectedVariant] = useState<string>("all");

  // Sample data
  const transactionWithReceipt = {
    id: "1",
    merchantName: "Starbucks",
    amount: 8.08,
    date: "2025-10-29",
    bankDate: "2025-10-30",
    hasReceipt: true,
    hasNote: true,
    hasItems: true,
    receiptData: {
      merchantName: "Starbucks",
      receiptDate: "2025-10-29",
      receiptTotal: 8.08,
      items: [
        { name: "Caffe Latte", price: 5.25 },
        { name: "Croissant", price: 2.15 },
        { name: "Tip", price: 0.68 },
      ],
    },
    note: "Coffee meeting with Sarah",
  };

  const transactionNoReceipt = {
    id: "2",
    merchantName: "Shell Gas Station",
    amount: 45.0,
    date: "2025-10-30",
    bankDate: "2025-10-30",
    hasReceipt: false,
    hasNote: false,
    hasItems: false,
  };

  const transactionPartial = {
    id: "3",
    merchantName: "Target",
    amount: 23.45,
    date: "2025-10-28",
    bankDate: "2025-10-29",
    hasReceipt: true,
    hasNote: false,
    hasItems: false,
    receiptData: {
      merchantName: "Target",
      receiptDate: "2025-10-28",
      receiptTotal: 23.45,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">UI Variants Demo</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing different visual approaches for transaction cards
          </p>
        </div>

        {/* Filter */}
        <div className="mb-8 flex gap-2">
          <button
            onClick={() => setSelectedVariant("all")}
            className={cn(
              "px-4 py-2 rounded-md transition-colors",
              selectedVariant === "all"
                ? "bg-primary text-white"
                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
            )}
          >
            All Variants
          </button>
          <button
            onClick={() => setSelectedVariant("transactions")}
            className={cn(
              "px-4 py-2 rounded-md transition-colors",
              selectedVariant === "transactions"
                ? "bg-primary text-white"
                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
            )}
          >
            Transaction Cards
          </button>
          <button
            onClick={() => setSelectedVariant("files")}
            className={cn(
              "px-4 py-2 rounded-md transition-colors",
              selectedVariant === "files"
                ? "bg-primary text-white"
                : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
            )}
          >
            File Cards
          </button>
        </div>

        {/* Transaction Card Variants */}
        {(selectedVariant === "all" || selectedVariant === "transactions") && (
          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Transaction Cards - Variant A: Progress Ring
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Shows completion percentage with circular progress indicator
              </p>
              <div className="space-y-4">
                <TransactionCardProgressRing transaction={transactionWithReceipt} />
                <TransactionCardProgressRing transaction={transactionPartial} />
                <TransactionCardProgressRing transaction={transactionNoReceipt} />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Transaction Cards - Variant B: Ghost Placeholders
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Shows greyed-out placeholders for missing information
              </p>
              <div className="space-y-4">
                <TransactionCardGhostPlaceholders transaction={transactionWithReceipt} />
                <TransactionCardGhostPlaceholders transaction={transactionPartial} />
                <TransactionCardGhostPlaceholders transaction={transactionNoReceipt} />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Transaction Cards - Variant C: Inline Badges
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Simple badge indicators with expandable details
              </p>
              <div className="space-y-4">
                <TransactionCardInlineBadges transaction={transactionWithReceipt} />
                <TransactionCardInlineBadges transaction={transactionPartial} />
                <TransactionCardInlineBadges transaction={transactionNoReceipt} />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Transaction Cards - Variant D: Minimal with Dots
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Clean design with colored dots for status
              </p>
              <div className="space-y-4">
                <TransactionCardMinimalDots transaction={transactionWithReceipt} />
                <TransactionCardMinimalDots transaction={transactionPartial} />
                <TransactionCardMinimalDots transaction={transactionNoReceipt} />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Transaction Cards - Variant E: Outline/Shadow Board Style
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Empty "slots" that show what's missing (like tool outlines)
              </p>
              <div className="space-y-4">
                <TransactionCardOutlineSlots transaction={transactionWithReceipt} />
                <TransactionCardOutlineSlots transaction={transactionPartial} />
                <TransactionCardOutlineSlots transaction={transactionNoReceipt} />
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">
                Transaction Cards - Variant F: Compact with Emoji Status
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Very compact, uses emoji for quick visual scanning
              </p>
              <div className="space-y-4">
                <TransactionCardCompactEmoji transaction={transactionWithReceipt} />
                <TransactionCardCompactEmoji transaction={transactionPartial} />
                <TransactionCardCompactEmoji transaction={transactionNoReceipt} />
              </div>
            </section>
          </div>
        )}

        {/* File Card Variants */}
        {(selectedVariant === "all" || selectedVariant === "files") && (
          <div className="space-y-12 mt-12">
            <h2 className="text-2xl font-semibold">File Card Variants</h2>
            <p className="text-gray-600 dark:text-gray-400">Coming next...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Variant A: Progress Ring
function TransactionCardProgressRing({ transaction }: { transaction: any }) {
  const completionPercent = calculateCompletion(transaction);
  const circumference = 2 * Math.PI * 16;
  const strokeDashoffset = circumference - (completionPercent / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Progress Ring */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  "transition-all duration-500",
                  completionPercent === 100
                    ? "text-green-500"
                    : completionPercent >= 50
                    ? "text-yellow-500"
                    : "text-red-500"
                )}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium">{completionPercent}%</span>
            </div>
          </div>

          {/* Transaction Info */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{transaction.merchantName}</h3>
              <span className="font-semibold">${transaction.amount.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.date}</p>
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {transaction.hasReceipt && <div>✓ Receipt attached</div>}
              {transaction.hasItems && <div>✓ Items extracted</div>}
              {transaction.hasNote && <div>✓ Note added</div>}
              {!transaction.hasReceipt && <div className="text-gray-400">○ No receipt</div>}
              {!transaction.hasNote && <div className="text-gray-400">○ No note</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Variant B: Ghost Placeholders
function TransactionCardGhostPlaceholders({ transaction }: { transaction: any }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{transaction.merchantName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.date}</p>
        </div>
        <span className="font-semibold">${transaction.amount.toFixed(2)}</span>
      </div>

      <div className="space-y-2 text-sm">
        {transaction.hasReceipt ? (
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <span>📄</span>
            <span>Receipt: {transaction.receiptData.merchantName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
            <span>📄</span>
            <span className="italic">[Upload or drag receipt here]</span>
          </div>
        )}

        {transaction.hasNote ? (
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <span>💬</span>
            <span>"{transaction.note}"</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
            <span>💬</span>
            <span className="italic">[What was this for?]</span>
          </div>
        )}

        {transaction.hasItems ? (
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <span>🏷️</span>
            <span>{transaction.receiptData.items.length} items extracted</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-600">
            <span>🏷️</span>
            <span className="italic">[Items not yet extracted]</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Variant C: Inline Badges
function TransactionCardInlineBadges({ transaction }: { transaction: any }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{transaction.merchantName}</h3>
            {transaction.hasReceipt && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                📄 Receipt
              </span>
            )}
            {transaction.hasItems && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {transaction.receiptData.items.length} items
              </span>
            )}
            {transaction.hasNote && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                💬 Note
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{transaction.date}</p>
          {transaction.hasNote && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
              "{transaction.note}"
            </p>
          )}
        </div>
        <span className="font-semibold text-lg ml-4">${transaction.amount.toFixed(2)}</span>
      </div>
    </div>
  );
}

// Variant D: Minimal with Dots
function TransactionCardMinimalDots({ transaction }: { transaction: any }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Status Dots */}
          <div className="flex flex-col gap-1">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                transaction.hasReceipt ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"
              )}
              title={transaction.hasReceipt ? "Receipt attached" : "No receipt"}
            />
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                transaction.hasNote ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-700"
              )}
              title={transaction.hasNote ? "Note added" : "No note"}
            />
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                transaction.hasItems ? "bg-purple-500" : "bg-gray-300 dark:bg-gray-700"
              )}
              title={transaction.hasItems ? "Items extracted" : "No items"}
            />
          </div>

          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <h3 className="font-semibold">{transaction.merchantName}</h3>
              <span className="font-semibold">${transaction.amount.toFixed(2)}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.date}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Variant E: Outline/Shadow Board Style
function TransactionCardOutlineSlots({ transaction }: { transaction: any }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold">{transaction.merchantName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.date}</p>
        </div>
        <span className="font-semibold">${transaction.amount.toFixed(2)}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* Receipt Slot */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-3 text-center transition-all",
            transaction.hasReceipt
              ? "border-green-500 bg-green-50 dark:bg-green-950"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          )}
        >
          <div className="text-2xl mb-1">
            {transaction.hasReceipt ? "✓" : "📄"}
          </div>
          <div className="text-xs font-medium">
            {transaction.hasReceipt ? "Receipt" : "No Receipt"}
          </div>
        </div>

        {/* Note Slot */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-3 text-center transition-all",
            transaction.hasNote
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          )}
        >
          <div className="text-2xl mb-1">
            {transaction.hasNote ? "✓" : "💬"}
          </div>
          <div className="text-xs font-medium">
            {transaction.hasNote ? "Note" : "No Note"}
          </div>
        </div>

        {/* Items Slot */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-3 text-center transition-all",
            transaction.hasItems
              ? "border-purple-500 bg-purple-50 dark:bg-purple-950"
              : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          )}
        >
          <div className="text-2xl mb-1">
            {transaction.hasItems ? "✓" : "🏷️"}
          </div>
          <div className="text-xs font-medium">
            {transaction.hasItems ? `${transaction.receiptData.items.length} Items` : "No Items"}
          </div>
        </div>
      </div>
    </div>
  );
}

// Variant F: Compact with Emoji Status
function TransactionCardCompactEmoji({ transaction }: { transaction: any }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex gap-1 text-lg">
            <span title="Receipt">{transaction.hasReceipt ? "📄" : "📄"}</span>
            <span title="Note">{transaction.hasNote ? "💬" : "💬"}</span>
            <span title="Items">{transaction.hasItems ? "🏷️" : "🏷️"}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{transaction.merchantName}</span>
              <span className="font-semibold">${transaction.amount.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{transaction.date}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function
function calculateCompletion(transaction: any): number {
  let total = 0;
  let completed = 0;

  // Receipt
  total += 1;
  if (transaction.hasReceipt) completed += 1;

  // Note
  total += 1;
  if (transaction.hasNote) completed += 1;

  // Items
  total += 1;
  if (transaction.hasItems) completed += 1;

  return Math.round((completed / total) * 100);
}
