"use client";

import { Button } from "@/components/ui/button";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubscriptionCardProps {
  // Current subscription status
  hasSubscription?: boolean;
  isActive?: boolean;
  currentPeriodEnd?: string;

  // Current limits
  maxBanks?: number;
  maxChatsPerMonth?: number;
  maxStorageGB?: number;

  // Current usage
  currentBanksConnected?: number;
  currentChatsUsed?: number;
  currentStorageUsedGB?: number;

  // Add-on counts
  addonBanks?: number;
  addonChats?: number;
  addonStorage?: number;

  // Actions
  onSubscribe?: () => void;
  onAddBanks?: () => void;
  onAddChats?: () => void;
  onAddStorage?: () => void;
  onManageSubscription?: () => void;
}

export function SubscriptionCard({
  hasSubscription = false,
  isActive = false,
  currentPeriodEnd,
  maxBanks = 3,
  maxChatsPerMonth = 100,
  maxStorageGB = 5,
  currentBanksConnected = 0,
  currentChatsUsed = 0,
  currentStorageUsedGB = 0,
  addonBanks = 0,
  addonChats = 0,
  addonStorage = 0,
  onSubscribe,
  onAddBanks,
  onAddChats,
  onAddStorage,
  onManageSubscription,
}: SubscriptionCardProps) {
  // Calculate total annual price
  const basePrice = 21;
  const bankAddOnPrice = addonBanks * 10;
  const chatAddOnPrice = addonChats * 8;
  const storageAddOnPrice = addonStorage * 5;
  const totalPrice = basePrice + bankAddOnPrice + chatAddOnPrice + storageAddOnPrice;

  if (!hasSubscription) {
    // Not subscribed yet - show base subscription offer
    return (
      <div className="flex flex-col p-6 border bg-background">
        <h2 className="text-xl mb-2 text-left">Koffers Base</h2>
        <div className="mt-1 flex items-baseline">
          <span className="text-2xl font-medium tracking-tight">$21</span>
          <span className="ml-1 text-xl font-medium">/year</span>
          <span className="ml-2 text-xs text-muted-foreground">
            ($1.75/month)
          </span>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-left text-[#878787] font-mono">
            INCLUDING
          </h3>
          <ul className="mt-4 space-y-2">
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">3 Bank Institutions</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">100 AI Chats per Month</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">5GB Storage</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">All Core Features</span>
            </li>
          </ul>
        </div>

        <div className="mt-4 p-3 bg-muted/50 rounded">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Need more?</strong> Add what you use:
            <br />
            • +3 Banks: $10/year
            <br />
            • +100 Chats/month: $8/year
            <br />
            • +10GB Storage: $5/year
          </p>
        </div>

        <div className="mt-8 border-t-[1px] border-border pt-4">
          <Button
            className="h-9 w-full"
            onClick={onSubscribe}
          >
            Subscribe for $21/year
          </Button>
        </div>
      </div>
    );
  }

  // Already subscribed - show current plan and add-ons
  return (
    <div className="flex flex-col p-6 border border-primary bg-background">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl text-left">Your Subscription</h2>
        {isActive && (
          <span className="text-[9px] font-normal border border-green-500 text-green-500 px-2 py-1 rounded-full font-mono">
            ACTIVE
          </span>
        )}
      </div>

      <div className="mt-1 flex items-baseline">
        <span className="text-2xl font-medium tracking-tight">${totalPrice}</span>
        <span className="ml-1 text-xl font-medium">/year</span>
        <span className="ml-2 text-xs text-muted-foreground">
          (${(totalPrice / 12).toFixed(2)}/month)
        </span>
      </div>

      {currentPeriodEnd && (
        <p className="text-xs text-muted-foreground mt-2">
          Renews on {new Date(currentPeriodEnd).toLocaleDateString()}
        </p>
      )}

      <div className="mt-6">
        <h3 className="text-xs font-medium uppercase tracking-wide text-left text-[#878787] font-mono mb-4">
          CURRENT LIMITS
        </h3>

        {/* Banks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Bank Institutions</span>
                <span className="text-muted-foreground">
                  {currentBanksConnected} / {maxBanks}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    currentBanksConnected >= maxBanks ? "bg-red-500" : "bg-primary"
                  )}
                  style={{ width: `${(currentBanksConnected / maxBanks) * 100}%` }}
                />
              </div>
              {addonBanks > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Base (3) + {addonBanks} add-on{addonBanks > 1 ? 's' : ''} (+{addonBanks * 3})
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-3 h-7 px-2"
              onClick={onAddBanks}
            >
              <Plus className="h-3 w-3 mr-1" />
              <span className="text-xs">Add</span>
            </Button>
          </div>

          {/* Chats */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>AI Chats This Month</span>
                <span className="text-muted-foreground">
                  {currentChatsUsed} / {maxChatsPerMonth}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    currentChatsUsed >= maxChatsPerMonth ? "bg-red-500" : "bg-primary"
                  )}
                  style={{ width: `${(currentChatsUsed / maxChatsPerMonth) * 100}%` }}
                />
              </div>
              {addonChats > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Base (100) + {addonChats} add-on{addonChats > 1 ? 's' : ''} (+{addonChats * 100})
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-3 h-7 px-2"
              onClick={onAddChats}
            >
              <Plus className="h-3 w-3 mr-1" />
              <span className="text-xs">Add</span>
            </Button>
          </div>

          {/* Storage */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Storage</span>
                <span className="text-muted-foreground">
                  {currentStorageUsedGB.toFixed(2)} GB / {maxStorageGB} GB
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    currentStorageUsedGB >= maxStorageGB ? "bg-red-500" : "bg-primary"
                  )}
                  style={{ width: `${(currentStorageUsedGB / maxStorageGB) * 100}%` }}
                />
              </div>
              {addonStorage > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Base (5GB) + {addonStorage} add-on{addonStorage > 1 ? 's' : ''} (+{addonStorage * 10}GB)
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-3 h-7 px-2"
              onClick={onAddStorage}
            >
              <Plus className="h-3 w-3 mr-1" />
              <span className="text-xs">Add</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-4 space-y-2">
        <Button
          variant="secondary"
          className="h-9 w-full"
          onClick={onManageSubscription}
        >
          Manage Subscription
        </Button>
      </div>
    </div>
  );
}
