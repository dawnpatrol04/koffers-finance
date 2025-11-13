import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getCurrentUser, createSessionClient } from "@/lib/appwrite-server";
import { DATABASE_ID, COLLECTIONS } from "@/lib/appwrite-config";
import { Query } from "node-appwrite";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
}

const ADDON_PRICE_IDS = {
  banks: process.env.NEXT_PUBLIC_STRIPE_PRICE_ADDON_BANKS!,
  chats: process.env.NEXT_PUBLIC_STRIPE_PRICE_ADDON_CHATS!,
  storage: process.env.NEXT_PUBLIC_STRIPE_PRICE_ADDON_STORAGE!,
};

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();

    // Get authenticated user from session cookie
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { addonType } = body;

    if (!addonType || !["banks", "chats", "storage"].includes(addonType)) {
      return NextResponse.json(
        { error: "Valid addon type is required (banks, chats, or storage)" },
        { status: 400 }
      );
    }

    // Fetch user's subscription from Appwrite
    const { databases } = await createSessionClient();

    const subscriptions = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      [Query.equal("userId", user.$id)]
    );

    if (subscriptions.documents.length === 0) {
      return NextResponse.json(
        { error: "Subscription not found. Please subscribe first." },
        { status: 404 }
      );
    }

    const subscription = subscriptions.documents[0];
    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No Stripe subscription ID found" },
        { status: 400 }
      );
    }

    const priceId = ADDON_PRICE_IDS[addonType as keyof typeof ADDON_PRICE_IDS];

    // Add the add-on to the subscription
    await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      proration_behavior: "create_prorations",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding add-on:", error);
    return NextResponse.json(
      { error: "Failed to add add-on" },
      { status: 500 }
    );
  }
}
