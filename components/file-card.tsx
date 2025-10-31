"use client"

import { cn } from "@/lib/utils"
import { FileText, Receipt, FileCheck, Clock, AlertCircle, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { FileDocument } from "@/types/file"
import Image from "next/image"

interface FileCardProps {
  file: FileDocument
  onClick?: (file: FileDocument) => void
}

export function FileCard({ file, onClick }: FileCardProps) {
  if (file.isReceipt) {
    return <ReceiptCard file={file} onClick={onClick} />
  }

  return <DocumentCard file={file} onClick={onClick} />
}

function ReceiptCard({ file, onClick }: FileCardProps) {
  const matchStatus = file.matchStatus || "unmatched"

  const statusConfig = {
    matched: {
      icon: FileCheck,
      color: "text-green-600 dark:text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      label: "Matched",
      description: "Linked to transaction",
      backdropColor: "bg-green-50/95 dark:bg-green-950/95",
      shadowColor: "shadow-green-500/20",
    },
    pending: {
      icon: Clock,
      color: "text-amber-600 dark:text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      label: "Pending",
      description: "Transaction may not have posted",
      backdropColor: "bg-amber-50/95 dark:bg-amber-950/95",
      shadowColor: "shadow-amber-500/20",
    },
    unmatched: {
      icon: AlertCircle,
      color: "text-muted-foreground/40",
      bgColor: "bg-transparent",
      borderColor: "border-dashed border-muted-foreground/30",
      label: "Needs Attention",
      description: "No matching transaction found",
      backdropColor: "bg-background/95 dark:bg-background/95",
      shadowColor: "shadow-muted-foreground/10",
    },
  }

  const status = statusConfig[matchStatus]
  const StatusIcon = status.icon

  return (
    <button
      onClick={() => onClick?.(file)}
      className={cn(
        "group relative w-full text-left rounded-lg border transition-all duration-200",
        status.borderColor,
        matchStatus === "matched" ? "bg-card hover:shadow-md" : "bg-card hover:bg-accent/50",
        "active:scale-[0.98]",
      )}
    >
      {/* Image Preview */}
      <div className="aspect-[4/3] bg-muted rounded-t-lg overflow-hidden relative">
        {file.thumbnailUrl ? (
          <Image src={file.thumbnailUrl || "/placeholder.svg"} alt={file.name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Receipt className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        <div
          className={cn(
            "absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md",
            status.backdropColor,
            "border",
            status.borderColor,
            "shadow-lg",
            status.shadowColor,
            "backdrop-blur-sm",
          )}
        >
          <StatusIcon className={cn("h-3.5 w-3.5", status.color)} strokeWidth={matchStatus === "matched" ? 2.5 : 1.5} />
          <span className={cn("text-xs font-semibold", status.color)}>{status.label}</span>
        </div>
      </div>

      {/* Receipt Info */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{file.receiptData?.merchant || "Unknown Merchant"}</h3>
            <p className="text-xs text-muted-foreground">{file.receiptData?.date || file.uploadedAt}</p>
          </div>

          {file.receiptData?.total && (
            <span className="text-sm font-semibold whitespace-nowrap">${file.receiptData.total.toFixed(2)}</span>
          )}
        </div>

        {file.receiptData?.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{file.receiptData.location}</span>
          </div>
        )}

        {matchStatus === "unmatched" && <p className="text-xs text-muted-foreground/70 italic">{status.description}</p>}
      </div>

      {/* Ghost outline for unmatched receipts */}
      {matchStatus === "unmatched" && (
        <div className="absolute inset-0 rounded-lg border-2 border-dashed border-muted-foreground/20 pointer-events-none" />
      )}
    </button>
  )
}

function DocumentCard({ file, onClick }: FileCardProps) {
  return (
    <button
      onClick={() => onClick?.(file)}
      className="group relative w-full text-left rounded-lg border border-border bg-card hover:bg-accent/50 transition-all duration-200 active:scale-[0.98]"
    >
      {/* Document Preview */}
      <div className="aspect-[4/3] bg-muted rounded-t-lg overflow-hidden relative">
        {file.thumbnailUrl ? (
          <Image src={file.thumbnailUrl || "/placeholder.svg"} alt={file.name} fill className="object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <FileText className="h-16 w-16 text-muted-foreground/20" />
          </div>
        )}

        {/* Document Type Badge */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">
            {file.type.replace("-", " ")}
          </Badge>
        </div>
      </div>

      {/* Document Info */}
      <div className="p-3 space-y-1">
        <h3 className="font-semibold text-sm truncate">{file.title || file.name}</h3>

        {file.description && <p className="text-xs text-muted-foreground line-clamp-2">{file.description}</p>}

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <span>{file.uploadedAt}</span>
          <span>•</span>
          <span>{formatFileSize(file.size)}</span>
        </div>

        {file.tags && file.tags.length > 0 && (
          <div className="flex gap-1 pt-1 flex-wrap">
            {file.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </button>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
