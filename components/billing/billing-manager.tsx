"use client";

import { useState, useEffect } from "react";
import { SubscriptionCard } from "./subscription-card";
import { AddOnModal } from "./add-on-modal";
import { useUser } from "@/contexts/user-context";
import { useRouter } from "next/navigation";
import { databases } from "@/lib/appwrite-client";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite-config";
import { Query } from "appwrite";

interface Subscription {
  hasSubscription: boolean;
  isActive: boolean;
  currentPeriodEnd?: string;
  maxBanks: number;
  maxChatsPerMonth: number;
  maxStorageGB: number;
  currentBanksConnected: number;
  currentChatsUsed: number;
  currentStorageUsedGB: number;
  addonBanks: number;
  addonChats: number;
  addonStorage: number;
}

export function BillingManager() {
  const { user } = useUser();
  const router = useRouter();

  const [subscription, setSubscription] = useState<Subscription>({
    hasSubscription: false,
    isActive: false,
    maxBanks: 3,
    maxChatsPerMonth: 100,
    maxStorageGB: 5,
    currentBanksConnected: 0,
    currentChatsUsed: 0,
    currentStorageUsedGB: 0,
    addonBanks: 0,
    addonChats: 0,
    addonStorage: 0,
  });

  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  const [addOnModal, setAddOnModal] = useState<{
    open: boolean;
    type: "banks" | "chats" | "storage" | null;
  }>({
    open: false,
    type: null,
  });

  const [loading, setLoading] = useState(false);

  // Fetch subscription data from Appwrite
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscriptionLoading(false);
        return;
      }

      try {
        const subscriptions = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.SUBSCRIPTIONS,
          [Query.equal("userId", user.$id)]
        );

        if (subscriptions.documents.length > 0) {
          const subDoc = subscriptions.documents[0];

          setSubscription({
            hasSubscription: true,
            isActive: subDoc.status === "active",
            currentPeriodEnd: subDoc.currentPeriodEnd,
            maxBanks: subDoc.maxBanks,
            maxChatsPerMonth: subDoc.maxChatsPerMonth,
            maxStorageGB: subDoc.maxStorageGB,
            currentBanksConnected: subDoc.currentBanksConnected,
            currentChatsUsed: subDoc.currentChatsUsed,
            currentStorageUsedGB: subDoc.currentStorageUsedGB,
            addonBanks: subDoc.addonBanks,
            addonChats: subDoc.addonChats,
            addonStorage: subDoc.addonStorage,
          });
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscription();
  }, [user]);

  // Handle initial subscription
  const handleSubscribe = async () => {
    try {
      setLoading(true);

      // Call Stripe checkout API (user auth handled server-side via session cookie)
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle add-on purchase
  const handleAddOn = async (type: "banks" | "chats" | "storage") => {
    setAddOnModal({ open: true, type });
  };

  const confirmAddOn = async () => {
    if (!addOnModal.type) return;

    try {
      setLoading(true);

      // Call add-on API (user auth handled server-side via session cookie)
      const response = await fetch("/api/stripe/add-addon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addonType: addOnModal.type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Add-on successfully added!");
        setAddOnModal({ open: false, type: null });

        // Refresh subscription data
        const subscriptions = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.SUBSCRIPTIONS,
          [Query.equal("userId", user!.$id)]
        );

        if (subscriptions.documents.length > 0) {
          const subDoc = subscriptions.documents[0];
          setSubscription({
            hasSubscription: true,
            isActive: subDoc.status === "active",
            currentPeriodEnd: subDoc.currentPeriodEnd,
            maxBanks: subDoc.maxBanks,
            maxChatsPerMonth: subDoc.maxChatsPerMonth,
            maxStorageGB: subDoc.maxStorageGB,
            currentBanksConnected: subDoc.currentBanksConnected,
            currentChatsUsed: subDoc.currentChatsUsed,
            currentStorageUsedGB: subDoc.currentStorageUsedGB,
            addonBanks: subDoc.addonBanks,
            addonChats: subDoc.addonChats,
            addonStorage: subDoc.addonStorage,
          });
        }
      } else {
        throw new Error(data.error || "Failed to add add-on");
      }
    } catch (error) {
      console.error("Error adding add-on:", error);
      alert("Failed to add add-on. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle manage subscription (Stripe Customer Portal)
  const handleManageSubscription = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No portal URL returned");
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      alert("Failed to open subscription management. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <>
      <SubscriptionCard
        {...subscription}
        onSubscribe={handleSubscribe}
        onAddBanks={() => handleAddOn("banks")}
        onAddChats={() => handleAddOn("chats")}
        onAddStorage={() => handleAddOn("storage")}
        onManageSubscription={handleManageSubscription}
      />

      {addOnModal.type && (
        <AddOnModal
          open={addOnModal.open}
          onOpenChange={(open) => setAddOnModal({ open, type: addOnModal.type })}
          type={addOnModal.type}
          onConfirm={confirmAddOn}
          loading={loading}
        />
      )}
    </>
  );
}
