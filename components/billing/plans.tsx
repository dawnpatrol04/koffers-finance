"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function Plans() {
  const handleChoosePlan = (plan: string) => {
    // Placeholder - will integrate with payment provider later
    console.log(`Choose ${plan} plan clicked`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-7 w-full">
      {/* Starter Plan */}
      <div className="flex flex-col p-6 border bg-background">
        <h2 className="text-xl mb-2 text-left">Starter</h2>
        <div className="mt-1 flex items-baseline">
          <span className="text-2xl font-medium tracking-tight">$29</span>
          <span className="ml-1 text-xl font-medium">/mo</span>
          <span className="ml-2 text-xs text-muted-foreground">
            Excl. VAT
          </span>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-left text-[#878787] font-mono">
            INCLUDING
          </h3>
          <ul className="mt-4 space-y-2">
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">
                Send up to 10 invoices per month
              </span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">2 connected banks</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Unlimited bank accounts</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Financial overview</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Time Tracker</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">50 inbox items per month</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Customer management</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Export CSV & reports</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Assistant</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">10GB Vault Storage</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">2 users</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 border-t-[1px] border-border pt-4">
          <Button
            variant="secondary"
            className="h-9 hover:bg-primary hover:text-secondary w-full"
            onClick={() => handleChoosePlan("starter")}
          >
            Choose starter plan
          </Button>
        </div>
      </div>

      {/* Pro Plan */}
      <div className="flex flex-col p-6 border border-primary bg-background relative">
        <div className="absolute top-6 right-6 rounded-full text-[#878787] text-[9px] font-normal border px-2 py-1 font-mono">
          Limited offer
        </div>
        <h2 className="text-xl text-left mb-2">Pro</h2>
        <div className="mt-1 flex items-baseline">
          <span
            className={cn(
              "text-2xl font-medium tracking-tight",
              "line-through text-[#878787]",
            )}
          >
            $99
          </span>
          <span className="ml-1 text-2xl font-medium tracking-tight">
            $49
          </span>

          <span className="ml-1 text-xl font-medium">/mo</span>
          <span className="ml-2 text-xs text-muted-foreground">
            Excl. VAT
          </span>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-left text-[#878787] font-mono">
            INCLUDING
          </h3>
          <ul className="mt-4 space-y-2">
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">
                Send up to 50 invoices per month
              </span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">10 connected banks</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Unlimited bank accounts</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Financial overview</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Time Tracker</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">500 inbox items per month</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Customer management</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Export CSV & reports</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">Assistant</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">100GB Vault Storage</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-xs">10 users</span>
            </li>
          </ul>
        </div>

        <div className="mt-8 border-t border-border pt-4">
          <Button
            className="h-9 w-full"
            onClick={() => handleChoosePlan("pro")}
          >
            Choose pro plan
          </Button>
        </div>
      </div>
    </div>
  );
}
