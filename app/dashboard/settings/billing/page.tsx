import { Plans } from "@/components/billing/plans";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing | Koffers",
};

export default function BillingSettings() {
  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-lg font-medium leading-none tracking-tight mb-4">
          Plans
        </h2>

        <Plans />
      </div>
    </div>
  );
}
