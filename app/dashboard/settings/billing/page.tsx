"use client";

import { BillingManager } from "@/components/billing/billing-manager";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle, XCircle } from "lucide-react";

function BillingContent() {
  const searchParams = useSearchParams();
  const [notification, setNotification] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      setNotification({
        type: "success",
        message: "Subscription activated successfully! Your account has been upgraded.",
      });

      // Clear notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification({ type: null, message: "" });
      }, 5000);

      return () => clearTimeout(timer);
    }

    if (canceled === "true") {
      setNotification({
        type: "error",
        message: "Checkout was canceled. You can try again anytime.",
      });

      // Clear notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification({ type: null, message: "" });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="space-y-12">
      {notification.type && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            notification.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 mt-0.5" />
          )}
          <p className="text-sm">{notification.message}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-medium leading-none tracking-tight mb-4">
          Subscription
        </h2>

        <BillingManager />
      </div>
    </div>
  );
}

export default function BillingSettings() {
  return (
    <Suspense fallback={
      <div className="space-y-12">
        <div>
          <h2 className="text-lg font-medium leading-none tracking-tight mb-4">
            Subscription
          </h2>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
