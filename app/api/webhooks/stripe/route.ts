import { NextRequest, NextResponse } from 'next/server';
import { BASE_PLAN_LIMITS, SubscriptionData } from '@/lib/subscription-helpers';
import { createAdminClient } from '@/lib/appwrite-server';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { ID, Permission, Role, Query } from 'node-appwrite';
import Stripe from 'stripe';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  // Verify webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  console.log('Received Stripe webhook event:', event.type);

  // Handle different event types
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const errorStack = err instanceof Error ? err.stack : undefined;
    console.error('Error processing webhook:', errorMessage, errorStack);
    return NextResponse.json(
      {
        error: 'Error processing webhook',
        details: errorMessage,
        stack: errorStack
      },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id);

  const stripe = getStripe();

  // Get userId - try subscription metadata first, then customer metadata
  let userId = subscription.metadata?.userId;

  if (!userId) {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (customer.deleted) {
      console.error('Customer was deleted');
      return;
    }
    userId = customer.metadata?.userId;
  }

  if (!userId) {
    console.error('No userId found in subscription or customer metadata');
    return;
  }

  // Calculate limits based on subscription items
  const limits = calculateLimits(subscription.items.data);

  // Get Appwrite clients
  const { databases } = await createAdminClient();

  // Check if subscription document already exists
  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  const subscriptionData = {
    userId,
    status: subscription.status,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    maxBanks: limits.institutionConnections,
    maxChatsPerMonth: limits.aiChatMessagesPerMonth,
    maxStorageGB: limits.storageGB,
    currentBanksConnected: existing.documents[0]?.currentBanksConnected || 0,
    currentChatsUsed: existing.documents[0]?.currentChatsUsed || 0,
    currentStorageUsedGB: existing.documents[0]?.currentStorageUsedGB || 0,
    addonBanks: 0, // TODO: Calculate from subscription items
    addonChats: 0,
    addonStorage: 0,
  };

  if (existing.documents.length > 0) {
    // Update existing document
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      existing.documents[0].$id,
      subscriptionData,
      [Permission.read(Role.user(userId))]
    );
    console.log('Updated subscription document:', userId);
  } else {
    // Create new document with user read permission
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      ID.unique(),
      subscriptionData,
      [Permission.read(Role.user(userId))]
    );
    console.log('Created subscription document:', userId);
  }

  console.log('Processed subscription update:', userId, limits);
}

/**
 * Handle subscription canceled
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log('Processing subscription cancellation:', subscription.id);

  const stripe = getStripe();

  // Get userId - try subscription metadata first, then customer metadata
  let userId = subscription.metadata?.userId;

  if (!userId) {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    if (customer.deleted) {
      console.error('Customer was deleted');
      return;
    }
    userId = customer.metadata?.userId;
  }

  if (!userId) {
    console.error('No userId found in subscription or customer metadata');
    return;
  }

  // Get Appwrite clients
  const { databases } = await createAdminClient();

  // Find the subscription document
  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (existing.documents.length > 0) {
    // Update status to canceled
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      existing.documents[0].$id,
      {
        status: 'canceled',
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      },
      [Permission.read(Role.user(userId))]
    );
    console.log('Marked subscription as canceled:', userId);
  } else {
    console.error('No subscription document found for user:', userId);
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Processing successful payment:', invoice.id);

  if (!invoice.subscription) {
    console.log('Invoice not associated with a subscription');
    return;
  }

  const stripe = getStripe();

  // Retrieve the subscription
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

  // Update subscription status to active
  await handleSubscriptionUpdate(subscription);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing failed payment:', invoice.id);

  if (!invoice.subscription) {
    console.log('Invoice not associated with a subscription');
    return;
  }

  const stripe = getStripe();

  // Retrieve the subscription to get metadata
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

  // Get userId - try subscription metadata first, then customer metadata
  let userId = subscription.metadata?.userId;

  if (!userId) {
    const customer = await stripe.customers.retrieve(invoice.customer as string);
    if (customer.deleted) {
      console.error('Customer was deleted');
      return;
    }
    userId = customer.metadata?.userId;
  }

  if (!userId) {
    console.error('No userId found in subscription or customer metadata');
    return;
  }

  // Get Appwrite clients
  const { databases } = await createAdminClient();

  // Find the subscription document
  const existing = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (existing.documents.length > 0) {
    // Update status to past_due
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      existing.documents[0].$id,
      { status: 'past_due' },
      [Permission.read(Role.user(userId))]
    );
    console.log('Marked subscription as past_due:', userId);
  } else {
    console.error('No subscription document found for user:', userId);
  }
}

/**
 * Calculate limits based on subscription items
 */
function calculateLimits(items: Stripe.SubscriptionItem[]) {
  // Start with base plan limits
  const limits = { ...BASE_PLAN_LIMITS };

  // Map product IDs to limit increases
  items.forEach((item) => {
    const productId = typeof item.price.product === 'string'
      ? item.price.product
      : item.price.product.id;

    const quantity = item.quantity || 1;

    // Match against environment variable product IDs
    if (productId === process.env.STRIPE_PRODUCT_EXTRA_BANKS) {
      limits.institutionConnections += quantity;
    } else if (productId === process.env.STRIPE_PRODUCT_EXTRA_STORAGE) {
      limits.storageGB += quantity * 10; // Each add-on is 10GB
    } else if (productId === process.env.STRIPE_PRODUCT_EXTRA_AI_TOKENS) {
      limits.aiChatMessagesPerMonth += quantity * 10000; // Each add-on is 10K messages
    }
    // Priority support doesn't affect limits, just a flag we could check elsewhere
  });

  return limits;
}
