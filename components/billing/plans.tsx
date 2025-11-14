"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check, Plus, Minus } from "lucide-react";
import { useState } from "react";

type Addon = {
  id: string;
  name: string;
  description: string;
  pricePerUnit: number;
  enabled: boolean;
  quantity?: number;
  maxQuantity?: number;
  isQuantityBased?: boolean;
};

export function Plans() {
  const [addons, setAddons] = useState<Addon[]>([
    {
      id: "extra-banks",
      name: "Additional Bank Connections",
      description: "$3.60/year per additional bank (3 included)",
      pricePerUnit: 3.6,
      enabled: false,
      quantity: 1,
      maxQuantity: 100,
      isQuantityBased: true,
    },
    {
      id: "extra-storage",
      name: "Extra Vault Storage (10GB)",
      description: "$12/year per 10GB (10GB included)",
      pricePerUnit: 12,
      enabled: false,
      quantity: 1,
      maxQuantity: 10,
      isQuantityBased: true,
    },
    {
      id: "extra-ai-tokens",
      name: "Additional AI Chat Tokens",
      description: "$14.40/year per 10K extra messages",
      pricePerUnit: 14.4,
      enabled: false,
      quantity: 1,
      maxQuantity: 20,
      isQuantityBased: true,
    },
    {
      id: "priority-support",
      name: "Priority Support",
      description: "$60/year for 24/7 priority support",
      pricePerUnit: 60,
      enabled: false,
      isQuantityBased: false,
    },
  ]);

  const basePrice = 21.04; // Annual price for 3 banks
  const totalAddonPrice = addons
    .filter((addon) => addon.enabled)
    .reduce((sum, addon) => {
      if (addon.isQuantityBased && addon.quantity) {
        return sum + addon.pricePerUnit * addon.quantity;
      }
      return sum + addon.pricePerUnit;
    }, 0);
  const totalPrice = basePrice + totalAddonPrice;

  const toggleAddon = (addonId: string) => {
    setAddons((prev) =>
      prev.map((addon) =>
        addon.id === addonId ? { ...addon, enabled: !addon.enabled } : addon,
      ),
    );
  };

  const updateQuantity = (addonId: string, change: number) => {
    setAddons((prev) =>
      prev.map((addon) => {
        if (addon.id === addonId && addon.isQuantityBased && addon.quantity) {
          const newQuantity = Math.max(
            1,
            Math.min(addon.maxQuantity || 100, addon.quantity + change),
          );
          return { ...addon, quantity: newQuantity, enabled: true };
        }
        return addon;
      }),
    );
  };

  const handleSubscribe = () => {
    // Will integrate with Stripe
    const selectedAddons = addons
      .filter((addon) => addon.enabled)
      .map((addon) => addon.id);
    console.log("Subscribe clicked", {
      basePrice,
      addons: selectedAddons,
      totalPrice,
    });
  };

  return (
    <div className="space-y-8">
      {/* Base Plan */}
      <div className="max-w-2xl">
        <div className="flex flex-col p-6 border border-primary bg-background">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl mb-2 text-left">Koffers Pro</h2>
              <p className="text-sm text-muted-foreground">
                Everything you need to manage your finances
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline">
                <span className="text-3xl font-medium tracking-tight">
                  ${basePrice.toFixed(2)}
                </span>
                <span className="ml-1 text-xl font-medium">/year</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ${(basePrice / 12).toFixed(2)}/mo • Billed annually
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-left text-[#878787] font-mono mb-4">
              INCLUDED WITH BASE PLAN
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">3 bank connections</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">10GB vault storage</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">AI-powered categorization</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">Receipt scanning & OCR</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">Receipt line-item extraction</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">Spending insights</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">Natural language queries</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">Savings recommendations</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">CSV export</span>
              </div>
              <div className="flex items-start">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2 mt-0.5" />
                <span className="text-sm">Calendar integration</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add-ons Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-medium leading-none tracking-tight mb-2">
            Add-ons
          </h2>
          <p className="text-sm text-muted-foreground">
            Customize your plan with additional features
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addons.map((addon) => (
            <div
              key={addon.id}
              className={cn(
                "flex flex-col p-4 border bg-background transition-all",
                addon.enabled && "border-primary bg-primary/5",
                !addon.isQuantityBased && "cursor-pointer",
              )}
              onClick={
                !addon.isQuantityBased
                  ? () => toggleAddon(addon.id)
                  : undefined
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{addon.name}</h3>
                    {addon.enabled && !addon.isQuantityBased && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {addon.description}
                  </p>

                  {addon.isQuantityBased && addon.quantity !== undefined && (
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(addon.id, -1);
                        }}
                        disabled={addon.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-sm font-medium w-12 text-center">
                        {addon.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateQuantity(addon.id, 1);
                        }}
                        disabled={addon.quantity >= (addon.maxQuantity || 100)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="ml-4 text-right flex-shrink-0">
                  {addon.isQuantityBased && addon.quantity ? (
                    <div>
                      <div className="flex items-baseline">
                        <span className="text-sm font-medium">
                          +$
                          {(addon.pricePerUnit * addon.quantity).toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          /year
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {addon.quantity} × ${addon.pricePerUnit.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline">
                        <span className="text-sm font-medium">
                          +${addon.pricePerUnit.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          /year
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        ${(addon.pricePerUnit / 12).toFixed(2)}/mo
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total & Subscribe */}
      <div className="max-w-2xl">
        <div className="flex flex-col p-6 border-2 border-primary bg-background">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                Total Annual Cost
              </h3>
              {totalAddonPrice > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Base plan (${basePrice.toFixed(2)}) + add-ons ($
                  {totalAddonPrice.toFixed(2)})
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold tracking-tight">
                  ${totalPrice.toFixed(2)}
                </span>
                <span className="ml-1 text-xl font-medium">/year</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ${(totalPrice / 12).toFixed(2)}/mo • Billed annually
              </div>
            </div>
          </div>

          <Button className="h-10 w-full" onClick={handleSubscribe}>
            Subscribe to Koffers Pro
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-3">
            Cancel anytime. No long-term commitment.
          </p>
        </div>
      </div>
    </div>
  );
}
