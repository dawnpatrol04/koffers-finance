"use client"

import * as React from "react"
import { TransactionCard } from "@/components/transaction-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, ArrowLeft } from "lucide-react"
import type { Transaction } from "@/types/transaction"
import Link from "next/link"

// Mock data for demonstration
const mockTransactions: Transaction[] = [
  {
    id: "1",
    date: "10/28/2025",
    merchant: "GEICO",
    merchantSubtext: "GEICO",
    amount: -201.52,
    category: "Uncategorized",
    channel: "Other",
    status: "pending",
    hasReceipt: false,
    hasCommentary: false,
    isReviewed: false,
    hasTags: false,
    hasReminder: true,
    reminder: {
      id: "r1",
      message: "Tag as business expense before month end",
      completed: false,
    },
  },
  {
    id: "2",
    date: "10/28/2025",
    merchant: "McDonald's",
    merchantSubtext: "McDonald's",
    amount: -6.46,
    category: "Uncategorized",
    channel: "Other",
    status: "pending",
    hasReceipt: false,
    hasCommentary: false,
    isReviewed: false,
    hasTags: false,
    hasReminder: false,
  },
  {
    id: "3",
    date: "10/28/2025",
    merchant: "Ralphs",
    merchantSubtext: "Ralphs",
    amount: -31.76,
    category: "Groceries",
    channel: "Other",
    status: "pending",
    hasReceipt: true,
    hasCommentary: true,
    isReviewed: true,
    hasTags: true,
    hasReminder: false,
    reviewedBy: "Dave",
    reviewedAt: "10/28/2025",
    commentary: "Weekly grocery run - split between business snacks and personal items",
    receiptItems: [
      {
        id: "i1",
        name: "Organic Bananas",
        quantity: 1,
        price: 3.99,
        category: "Produce",
        tags: ["personal"],
      },
      {
        id: "i2",
        name: "Coffee Beans - Dark Roast",
        quantity: 2,
        price: 12.99,
        category: "Beverages",
        tags: ["business"],
      },
      {
        id: "i3",
        name: "Sparkling Water 12pk",
        quantity: 1,
        price: 5.99,
        category: "Beverages",
        tags: ["business"],
      },
      {
        id: "i4",
        name: "Mixed Nuts",
        quantity: 1,
        price: 8.79,
        category: "Snacks",
        tags: ["business"],
      },
    ],
  },
  {
    id: "4",
    date: "10/27/2025",
    merchant: "APPLE.COM/BILL",
    merchantSubtext: "APPLE.COM/BILL",
    amount: -2.99,
    category: "Subscriptions",
    channel: "Other",
    status: "completed",
    hasReceipt: true,
    hasCommentary: true,
    isReviewed: true,
    hasTags: true,
    hasReminder: false,
    reviewedBy: "Dave",
    reviewedAt: "10/27/2025",
  },
]

export default function TransactionsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterType, setFilterType] = React.useState("all")
  const [sortBy, setSortBy] = React.useState("date")

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Transactions</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{mockTransactions.length} transactions</span>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button variant={filterType === "all" ? "default" : "outline"} onClick={() => setFilterType("all")}>
              All
            </Button>
            <Button variant={filterType === "income" ? "default" : "outline"} onClick={() => setFilterType("income")}>
              Income
            </Button>
            <Button
              variant={filterType === "expenses" ? "default" : "outline"}
              onClick={() => setFilterType("expenses")}
            >
              Expenses
            </Button>
            <Button variant={filterType === "pending" ? "default" : "outline"} onClick={() => setFilterType("pending")}>
              Pending
            </Button>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="amount">Sort by Amount</SelectItem>
              <SelectItem value="merchant">Sort by Merchant</SelectItem>
              <SelectItem value="completion">Sort by Completion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        <div className="space-y-3">
          {/* Incomplete Transaction - Untrusted Data */}
          <div className="space-y-3 pt-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Incomplete Transaction (Untrusted Data)</h2>
              <p className="text-muted-foreground leading-relaxed">
                This component represents an <strong>incomplete transaction</strong> where we only have basic bank data.
                The merchant name and date are <strong>de-emphasized</strong> (lighter weight, muted color) because
                they're
                <strong>untrusted</strong> - the merchant name might be incorrect, and the date is just a processing
                date, not the actual purchase date (could be ±3-7 days off). The <strong>amount is emphasized</strong>{" "}
                because it's the only reliable piece of information. The dashed border creates subtle visual tension,
                signaling incompleteness. The ghost outline icons (receipt, notes) use the "shadow board" effect -
                showing empty slots that need to be filled, creating psychological discomfort that drives completion.
              </p>
            </div>
            <TransactionCard
              transaction={mockTransactions[0]}
              onUploadReceipt={(id) => console.log("Upload receipt for", id)}
              onAddCommentary={(id) => console.log("Add commentary for", id)}
              onMarkReviewed={(id) => console.log("Mark reviewed", id)}
              onAddTag={(id) => console.log("Add tag for", id)}
              onAddReminder={(id) => console.log("Add reminder for", id)}
            />
          </div>

          {/* Incomplete Transaction - With Reminder */}
          <div className="space-y-3 pt-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Incomplete Transaction with Active Reminder</h2>
              <p className="text-muted-foreground leading-relaxed">
                Similar to the incomplete state above, but with an <strong>active reminder</strong> displayed
                prominently in amber to draw attention. Reminders create urgency and help users remember to complete
                specific actions. The visual hierarchy prioritizes the reminder message while maintaining the untrusted
                data styling for merchant and date. Note that having{" "}
                <strong>no reminders is actually a good state</strong> - we only show them when action is needed.
              </p>
            </div>
            <TransactionCard
              transaction={mockTransactions[1]}
              onUploadReceipt={(id) => console.log("Upload receipt for", id)}
              onAddCommentary={(id) => console.log("Add commentary for", id)}
              onMarkReviewed={(id) => console.log("Mark reviewed", id)}
              onAddTag={(id) => console.log("Add tag for", id)}
              onAddReminder={(id) => console.log("Add reminder for", id)}
            />
          </div>

          {/* Complete Transaction - Trusted Data */}
          <div className="space-y-3 pt-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Complete Transaction (Trusted Data)</h2>
              <p className="text-muted-foreground leading-relaxed">
                This component represents a <strong>complete transaction</strong> with receipt, commentary, and full OCR
                data. The merchant name and all header information are now displayed with{" "}
                <strong>full confidence</strong> - solid typography, good contrast, and prominent styling - because we
                have the actual receipt to verify everything. The solid border signals completion and creates a sense of
                satisfaction. The <strong>receipt items are the hero content</strong>, displayed fully expanded by
                default, while the transaction header compresses to a supporting role. The filled icons (receipt, notes)
                with green accents signal completion. Tags are shown inline when they exist, providing quick
                categorization (business vs personal). This is the "organized house" state - everything in its place,
                creating calm and confidence.
              </p>
            </div>
            <TransactionCard
              transaction={mockTransactions[2]}
              onUploadReceipt={(id) => console.log("Upload receipt for", id)}
              onAddCommentary={(id) => console.log("Add commentary for", id)}
              onMarkReviewed={(id) => console.log("Mark reviewed", id)}
              onAddTag={(id) => console.log("Add tag for", id)}
              onAddReminder={(id) => console.log("Add reminder for", id)}
            />
          </div>

          {/* Design Pattern Summary */}
          <div className="space-y-3 pt-8 pb-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Design Pattern: Trust Hierarchy & Completion Bias</h2>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                <p>This design leverages two key psychological principles:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Completion Bias (Zeigarnik Effect)</strong> - Incomplete patterns create mild psychological
                    discomfort that drives people to complete them. The dashed borders and ghost outline icons act like
                    a "shadow board" in manufacturing - when tools are missing, the outline shows what needs to be
                    filled.
                  </li>
                  <li>
                    <strong>Trust Hierarchy</strong> - Visual weight and emphasis communicate data confidence. Untrusted
                    data (bank processing info) is de-emphasized, while trusted data (verified receipt info) is
                    displayed confidently. This helps users intuitively understand which information is reliable.
                  </li>
                  <li>
                    <strong>Progressive Disclosure</strong> - Complete transactions expand to show full detail (receipt
                    items) while compressing the header. Incomplete transactions stay compact to minimize scrolling for
                    users who don't use these features.
                  </li>
                  <li>
                    <strong>Poka-Yoke (Mistake-Proofing)</strong> - The design makes the correct action the easiest
                    action. Empty slots are clickable and invite interaction, while complete states provide visual
                    satisfaction.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Additional Transaction Examples */}
          <div className="space-y-3 pt-8">
            <h2 className="text-2xl font-semibold">All Transactions</h2>
            {mockTransactions.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                onUploadReceipt={(id) => console.log("Upload receipt for", id)}
                onAddCommentary={(id) => console.log("Add commentary for", id)}
                onMarkReviewed={(id) => console.log("Mark reviewed", id)}
                onAddTag={(id) => console.log("Add tag for", id)}
                onAddReminder={(id) => console.log("Add reminder for", id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
