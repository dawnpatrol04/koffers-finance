"use client"

import type * as React from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { FileText, MessageSquare, Bell } from "lucide-react"
import type { Transaction } from "@/types/transaction"

interface TransactionCardProps {
  transaction: Transaction
  onClick?: (id: string) => void
  onUploadReceipt?: (id: string) => void
  onAddCommentary?: (id: string) => void
  onMarkReviewed?: (id: string) => void
  onAddTag?: (id: string) => void
  onAddReminder?: (id: string) => void
}

export function TransactionCard({
  transaction,
  onClick,
  onUploadReceipt,
  onAddCommentary,
  onMarkReviewed,
  onAddTag,
  onAddReminder,
}: TransactionCardProps) {
  const isComplete = transaction.hasReceipt && transaction.hasCommentary
  const hasReceiptItems = transaction.receiptItems && transaction.receiptItems.length > 0

  return (
    <>
      <div
        onClick={() => onClick?.(transaction.id)}
        className={cn(
          "border rounded-lg transition-all duration-200",
          onClick && "cursor-pointer hover:border-foreground/20",
          isComplete ? "bg-card border-border" : "bg-card border-dashed border-muted-foreground/30",
        )}
      >
        <div className={cn("p-4", hasReceiptItems && "pb-3")}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {!transaction.isReviewed && (
                  <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" title="Unread" />
                )}
                <h3
                  className={cn(
                    "font-semibold transition-all",
                    hasReceiptItems
                      ? "text-base text-foreground" // Complete: confident and clear
                      : "text-base text-muted-foreground/60 font-normal", // Incomplete: de-emphasized, untrusted
                  )}
                >
                  {transaction.merchant}
                </h3>
                {transaction.status === "pending" && (
                  <Badge variant="secondary" className="text-xs">
                    Pending
                  </Badge>
                )}

                <div className="flex items-center gap-1 ml-auto">
                  <ActionIcon
                    icon={FileText}
                    label="Receipt"
                    completed={transaction.hasReceipt}
                    onClick={() => onUploadReceipt?.(transaction.id)}
                  />
                  <ActionIcon
                    icon={MessageSquare}
                    label="Notes"
                    completed={transaction.hasCommentary}
                    onClick={() => onAddCommentary?.(transaction.id)}
                  />
                </div>
              </div>

              <div
                className={cn(
                  "flex items-center gap-2",
                  hasReceiptItems
                    ? "text-xs text-muted-foreground" // Complete: smaller, supporting info
                    : "text-sm text-muted-foreground/50 font-light", // Incomplete: lighter, untrusted
                )}
              >
                <span>{transaction.date}</span>
                <span>•</span>
                <span>{transaction.category}</span>
                <span>•</span>
                <span>{transaction.channel}</span>
              </div>

              {transaction.tags && transaction.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {transaction.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <span
              className={cn(
                "font-semibold text-destructive whitespace-nowrap",
                hasReceiptItems ? "text-sm" : "text-base",
              )}
            >
              {transaction.amount < 0 ? "-" : ""}${Math.abs(transaction.amount).toFixed(2)}
            </span>
          </div>

          {transaction.hasReminder && transaction.reminder && (
            <div className="mt-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
              <Bell className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-300">{transaction.reminder.message}</span>
            </div>
          )}
        </div>

        {hasReceiptItems && (
          <div className="border-t bg-muted/30">
            <div className="p-4 space-y-2">
              {transaction.receiptItems!.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between py-2 px-3 rounded-md bg-background border transition-colors",
                    index === 0 && "border-l-2 border-l-green-500",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant={tag === "business" ? "default" : "secondary"} className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <span className="text-sm font-semibold whitespace-nowrap">${item.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-border my-6" />
    </>
  )
}

interface ActionIconProps {
  icon: React.ElementType
  label: string
  completed: boolean
  onClick?: () => void
}

function ActionIcon({ icon: Icon, label, completed, onClick }: ActionIconProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={completed}
      title={completed ? label : `Add ${label}`}
      className={cn(
        "group relative p-1.5 rounded-md transition-all duration-200",
        completed ? "bg-green-500/10 cursor-default" : "hover:bg-accent cursor-pointer active:scale-95",
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 transition-all duration-200",
          completed
            ? "text-green-600 dark:text-green-500"
            : "text-muted-foreground/40 group-hover:text-muted-foreground/70",
        )}
        strokeWidth={completed ? 2.5 : 1.5}
      />

      {!completed && (
        <div className="absolute inset-0 rounded-md border border-dashed border-muted-foreground/20 pointer-events-none" />
      )}

      {completed && (
        <div className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-500 border border-background" />
      )}
    </button>
  )
}
