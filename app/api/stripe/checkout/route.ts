import { NextResponse } from "next/server";
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

export async function POST() {
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

    // Get user's email for Stripe customer
    const { databases } = await createSessionClient();

    // Check if user already has a subscription
    const existingSubscriptions = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS || "subscriptions",
      [Query.equal("userId", user.$id)]
    );

    if (existingSubscriptions.documents.length > 0) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.$id,
      },
    });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASE!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/settings/billing?canceled=true`,
      metadata: {
        userId: user.$id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
