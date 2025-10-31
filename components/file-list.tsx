"use client"

import { cn } from "@/lib/utils"
import { FileText, Receipt, FileCheck, Clock, AlertCircle, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { FileDocument } from "@/types/file"

interface FileListProps {
  files: FileDocument[]
  onFileClick?: (file: FileDocument) => void
  onDelete?: (fileId: string) => void
}

export function FileList({ files, onFileClick, onDelete }: FileListProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Name</th>
            <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Type</th>
            <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Status</th>
            <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Date</th>
            <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Size</th>
            <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <FileListRow
              key={file.id}
              file={file}
              onClick={() => onFileClick?.(file)}
              onDelete={() => onDelete?.(file.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface FileListRowProps {
  file: FileDocument
  onClick?: () => void
  onDelete?: () => void
}

function FileListRow({ file, onClick, onDelete }: FileListRowProps) {
  const matchStatus = file.matchStatus || "unmatched"

  const statusConfig = {
    matched: {
      icon: FileCheck,
      color: "text-green-600 dark:text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      label: "Matched",
    },
    pending: {
      icon: Clock,
      color: "text-amber-600 dark:text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      label: "Pending",
    },
    unmatched: {
      icon: AlertCircle,
      color: "text-muted-foreground/40",
      bgColor: "bg-transparent",
      borderColor: "border-dashed border-muted-foreground/30",
      label: "Needs Attention",
    },
  }

  const status = file.isReceipt ? statusConfig[matchStatus] : null
  const StatusIcon = status?.icon

  return (
    <tr
      onClick={onClick}
      className={cn(
        "border-b last:border-b-0 transition-colors cursor-pointer",
        file.isReceipt && matchStatus === "unmatched" && "bg-muted/20",
        "hover:bg-accent/50",
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {file.isReceipt ? (
              <Receipt className="h-5 w-5 text-muted-foreground" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {file.isReceipt && file.receiptData?.merchant ? file.receiptData.merchant : file.title || file.name}
            </p>
            {file.isReceipt && file.receiptData?.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{file.receiptData.location}</span>
              </div>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <Badge variant="secondary" className="text-xs">
          {file.type.replace("-", " ")}
        </Badge>
      </td>

      <td className="px-4 py-3">
        {status && StatusIcon ? (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-md",
              status.bgColor,
              "border",
              status.borderColor,
            )}
          >
            <StatusIcon
              className={cn("h-3.5 w-3.5", status.color)}
              strokeWidth={matchStatus === "matched" ? 2.5 : 1.5}
            />
            <span className={cn("text-xs font-medium", status.color)}>{status.label}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">{file.receiptData?.date || file.uploadedAt}</span>
      </td>

      <td className="px-4 py-3">
        <span className="text-sm text-muted-foreground">{formatFileSize(file.size)}</span>
      </td>

      <td className="px-4 py-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.()
          }}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Delete
        </Button>
      </td>
    </tr>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
