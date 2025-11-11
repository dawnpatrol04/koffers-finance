"use client";

import { useState, useEffect } from "react";
import { ReceiptUpload } from "@/components/receipts/receipt-upload";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Receipt {
  id: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  ocrStatus: "pending" | "completed" | "failed";
  createdAt: string;
  transactionId: string | null;
  fileType: string | null;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "failed">("all");

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("status", filter);
      }

      const response = await fetch(`/api/files/list?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch receipts");

      const data = await response.json();
      setReceipts(data.files);
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [filter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const filteredReceipts = receipts;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Receipts</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage your receipt images
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Upload Receipts</h2>
        <ReceiptUpload onUploadComplete={fetchReceipts} />
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-border">
        {[
          { label: "All", value: "all" },
          { label: "Pending", value: "pending" },
          { label: "Completed", value: "completed" },
          { label: "Failed", value: "failed" },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as typeof filter)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              filter === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Receipts List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading receipts...
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No receipts found. Upload your first receipt above.
            </p>
          </div>
        ) : (
          filteredReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                  {receipt.mimeType.startsWith("image/") ? (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">{receipt.fileName}</p>
                    {getStatusIcon(receipt.ocrStatus)}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-muted-foreground">
                      {(receipt.fileSize / 1024).toFixed(0)} KB
                    </p>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground">
                      {new Date(receipt.createdAt).toLocaleDateString()}
                    </p>
                    {receipt.transactionId && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <p className="text-sm text-blue-600">Linked to transaction</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(receipt.ocrStatus)}
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
