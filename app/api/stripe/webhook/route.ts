import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/appwrite-server";
import { DATABASE_ID, COLLECTIONS, ID } from "@/lib/appwrite-config";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No signature found" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`Received webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session, stripe);
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription, stripe);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, stripe);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, stripe);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice, stripe);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice, stripe);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// Handle successful checkout
async function handleCheckoutComplete(session: Stripe.Checkout.Session, stripe: Stripe) {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  const { databases } = await createAdminClient();

  // The subscription will be created by customer.subscription.created event
  // Just log for now
  console.log(`Checkout complete for user ${userId}`);
}

// Handle new subscription creation
async function handleSubscriptionCreated(subscription: Stripe.Subscription, stripe: Stripe) {
  const customerId = subscription.customer as string;

  // Get customer to retrieve userId from metadata
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    console.error("Customer was deleted");
    return;
  }

  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error("No userId in customer metadata");
    return;
  }

  const { databases } = await createAdminClient();

  // Create subscription document in Appwrite
  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    ID.unique(),
    {
      userId: userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      basePlan: true,
      basePlanPriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BASE!,
      addonBanks: 0,
      addonChats: 0,
      addonStorage: 0,
      maxBanks: 3,
      maxChatsPerMonth: 100,
      maxStorageGB: 5,
      currentBanksConnected: 0,
      currentChatsUsed: 0,
      currentStorageUsedGB: 0,
      usageResetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );

  console.log(`Subscription created for user ${userId}`);
}

// Handle subscription updates (add-ons added/removed)
async function handleSubscriptionUpdated(subscription: Stripe.Subscription, stripe: Stripe) {
  const customerId = subscription.customer as string;

  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    console.error("Customer was deleted");
    return;
  }

  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error("No userId in customer metadata");
    return;
  }

  const { databases } = await createAdminClient();

  // Find subscription document
  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    []
  );

  const subDoc = subscriptions.documents.find(
    (doc: any) => doc.userId === userId
  );

  if (!subDoc) {
    console.error(`No subscription found for user ${userId}`);
    return;
  }

  // Count add-ons by checking subscription items
  const items = subscription.items.data;
  let addonBanks = 0;
  let addonChats = 0;
  let addonStorage = 0;

  for (const item of items) {
    const priceId = item.price.id;

    // Skip base plan
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_BASE) {
      continue;
    }

    // Count add-ons
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ADDON_BANKS) {
      addonBanks += item.quantity;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ADDON_CHATS) {
      addonChats += item.quantity;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ADDON_STORAGE) {
      addonStorage += item.quantity;
    }
  }

  // Update subscription document
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subDoc.$id,
    {
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      addonBanks,
      addonChats,
      addonStorage,
      maxBanks: 3 + (addonBanks * 3),
      maxChatsPerMonth: 100 + (addonChats * 100),
      maxStorageGB: 5 + (addonStorage * 10),
      updatedAt: new Date().toISOString(),
    }
  );

  console.log(`Subscription updated for user ${userId}`);
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription, stripe: Stripe) {
  const customerId = subscription.customer as string;

  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    console.error("Customer was deleted");
    return;
  }

  const userId = customer.metadata?.userId;

  if (!userId) {
    console.error("No userId in customer metadata");
    return;
  }

  const { databases } = await createAdminClient();

  // Find subscription document
  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    []
  );

  const subDoc = subscriptions.documents.find(
    (doc: any) => doc.userId === userId
  );

  if (!subDoc) {
    console.error(`No subscription found for user ${userId}`);
    return;
  }

  // Update status to canceled
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subDoc.$id,
    {
      status: "canceled",
      updatedAt: new Date().toISOString(),
    }
  );

  console.log(`Subscription canceled for user ${userId}`);
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: Stripe.Invoice, stripe: Stripe) {
  console.log(`Payment succeeded for invoice ${invoice.id}`);
  // Could add logic here to send receipt email, etc.
}

// Handle failed payment
async function handlePaymentFailed(invoice: Stripe.Invoice, stripe: Stripe) {
  console.log(`Payment failed for invoice ${invoice.id}`);

  const customerId = invoice.customer as string;
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    return;
  }

  const userId = customer.metadata?.userId;

  if (!userId) {
    return;
  }

  const { databases } = await createAdminClient();

  // Find subscription and update status to past_due
  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    []
  );

  const subDoc = subscriptions.documents.find(
    (doc: any) => doc.userId === userId
  );

  if (subDoc) {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      subDoc.$id,
      {
        status: "past_due",
        updatedAt: new Date().toISOString(),
      }
    );
  }
}
