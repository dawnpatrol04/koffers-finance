"use client"

import { useState } from "react"
import { Upload, LayoutGrid, List, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FileCard } from "@/components/file-card"
import { FileList } from "@/components/file-list"
import type { FileDocument } from "@/types/file"
import Link from "next/link"

const mockFiles: FileDocument[] = [
  {
    id: "1",
    name: "IMG_5826.HEIC",
    type: "receipt",
    size: 960512,
    uploadedAt: "10/30/2025",
    isReceipt: true,
    matchStatus: "matched",
    transactionId: "txn_123",
    receiptData: {
      merchant: "Whole Foods Market",
      date: "10/30/2025",
      total: 47.82,
      location: "123 Main St, San Francisco, CA",
      latitude: 37.7749,
      longitude: -122.4194,
      items: [
        { name: "Organic Bananas", quantity: 1, price: 3.99 },
        { name: "Coffee Beans", quantity: 1, price: 12.99 },
        { name: "Sparkling Water", quantity: 2, price: 8.98 },
        { name: "Mixed Nuts", quantity: 1, price: 21.86 },
      ],
    },
    thumbnailUrl: "/grocery-receipt.jpg",
  },
  {
    id: "2",
    name: "IMG_5825.HEIC",
    type: "receipt",
    size: 1101926,
    uploadedAt: "10/30/2025",
    isReceipt: true,
    matchStatus: "pending",
    receiptData: {
      merchant: "The Corner Bar",
      date: "10/30/2025",
      total: 89.5,
      location: "456 Market St, San Francisco, CA",
    },
    thumbnailUrl: "/bar-receipt.jpg",
  },
  {
    id: "3",
    name: "IMG_5827.HEIC",
    type: "receipt",
    size: 1386496,
    uploadedAt: "10/29/2025",
    isReceipt: true,
    matchStatus: "unmatched",
    receiptData: {
      merchant: "Gas Station",
      date: "10/29/2025",
      total: 52.0,
    },
    thumbnailUrl: "/gas-station-receipt.png",
  },
  {
    id: "4",
    name: "2024_Tax_Return.pdf",
    type: "tax-document",
    size: 2458624,
    uploadedAt: "10/15/2025",
    isReceipt: false,
    title: "2024 Tax Return",
    description: "Federal and state tax return documents for 2024",
    tags: ["tax", "2024", "important"],
  },
  {
    id: "5",
    name: "Bank_Statement_Sept.pdf",
    type: "bank-statement",
    size: 1843200,
    uploadedAt: "10/01/2025",
    isReceipt: false,
    title: "September Bank Statement",
    description: "Chase checking account statement",
    tags: ["banking", "september"],
  },
]

export default function FilesDemoPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Files</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 mb-8 text-center hover:border-muted-foreground/50 transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 rounded-full bg-muted">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">Drag and drop files here</h3>
            <p className="text-sm text-muted-foreground mb-4">or click the button below to select files</p>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Select Files
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Maximum file size: 20MB per file</p>
        </div>
      </div>

      {/* Files Display */}
      <div className="mb-4">
        <h2 className="text-xl font-bold">Your Files</h2>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {mockFiles.map((file) => (
            <FileCard key={file.id} file={file} onClick={(file) => console.log("Clicked file:", file)} />
          ))}
        </div>
      ) : (
        <FileList
          files={mockFiles}
          onFileClick={(file) => console.log("Clicked file:", file)}
          onDelete={(fileId) => console.log("Delete file:", fileId)}
        />
      )}
    </div>
  )
}
