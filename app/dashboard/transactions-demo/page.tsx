"use client"

import * as React from "react"
import { TransactionCard } from "@/components/transaction-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, ArrowLeft } from "lucide-react"
import type { Transaction } from "@/types/transaction"
import Link from "next/link"

// Mock data with realistic Koffers transactions
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

export default function TransactionsDemoPage() {
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
  )
}
