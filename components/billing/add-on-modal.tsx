"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check } from "lucide-react";

interface AddOnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "banks" | "chats" | "storage";
  onConfirm: () => void;
  loading?: boolean;
}

const ADD_ON_INFO = {
  banks: {
    title: "Add +3 Bank Connections",
    price: "$10/year",
    description: "Increase your bank connection limit by 3 institutions.",
    features: [
      "+3 more bank institutions",
      "Prorated to your current billing cycle",
      "Auto-renews with your subscription",
    ],
    note: "Each add-on gives you 3 more bank connections. All accounts within each bank are included.",
  },
  chats: {
    title: "Add +100 AI Chats per Month",
    price: "$8/year",
    description: "Increase your monthly AI chat limit by 100.",
    features: [
      "+100 AI financial assistant chats per month",
      "Prorated to your current billing cycle",
      "Auto-renews with your subscription",
    ],
    note: "You can add this multiple times if you need more than +100 chats.",
  },
  storage: {
    title: "Add +10GB Storage",
    price: "$5/year",
    description: "Increase your storage limit by 10GB for receipts and documents.",
    features: [
      "+10GB storage for receipts & documents",
      "Prorated to your current billing cycle",
      "Auto-renews with your subscription",
    ],
    note: "Store thousands more receipts and financial documents.",
  },
};

export function AddOnModal({
  open,
  onOpenChange,
  type,
  onConfirm,
  loading = false,
}: AddOnModalProps) {
  const info = ADD_ON_INFO[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{info.title}</DialogTitle>
          <DialogDescription>
            {info.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price */}
          <div className="flex items-baseline">
            <span className="text-3xl font-medium tracking-tight">{info.price}</span>
            <span className="ml-2 text-sm text-muted-foreground">
              (${parseFloat(info.price.replace("$", "").replace("/year", "")) / 12}/month)
            </span>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-[#878787] font-mono mb-3">
              INCLUDED
            </h4>
            <ul className="space-y-2">
              {info.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Note */}
          <div className="p-3 bg-muted/50 rounded">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> {info.note}
            </p>
          </div>

          {/* Proration explanation */}
          <div className="text-xs text-muted-foreground">
            You'll be charged a prorated amount for the time remaining in your current billing cycle.
            At your next renewal, the full price will be included.
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : `Add for ${info.price}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
