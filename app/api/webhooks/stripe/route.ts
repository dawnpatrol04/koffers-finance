import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { users } from '@/lib/appwrite-server';
import { BASE_PLAN_LIMITS, SubscriptionData } from '@/lib/subscription-helpers';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
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
    console.error('Error processing webhook:', err);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id);

  // Get userId from customer metadata
  const customer = await stripe.customers.retrieve(subscription.customer as string);

  if (customer.deleted) {
    console.error('Customer was deleted');
    return;
  }

  const userId = customer.metadata.userId;
  if (!userId) {
    console.error('No userId found in customer metadata');
    return;
  }

  // Calculate limits based on subscription items
  const limits = calculateLimits(subscription.items.data);

  // Get current user prefs
  const userPrefs = await users.getPrefs(userId);
  const currentSubscription = userPrefs.subscription as SubscriptionData | undefined;

  // Update user preferences with new subscription data
  await users.updatePrefs(userId, {
    ...userPrefs,
    subscription: {
      status: subscription.status,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      limits: limits,
      usage: currentSubscription?.usage || {
        institutionConnections: 0,
        storageGB: 0,
        aiChatMessagesThisMonth: 0,
        aiChatMessagesResetDate: new Date().toISOString(),
      },
    },
  });

  console.log('Updated user subscription:', userId, limits);
}

/**
 * Handle subscription canceled
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log('Processing subscription cancellation:', subscription.id);

  // Get userId from customer metadata
  const customer = await stripe.customers.retrieve(subscription.customer as string);

  if (customer.deleted) {
    console.error('Customer was deleted');
    return;
  }

  const userId = customer.metadata.userId;
  if (!userId) {
    console.error('No userId found in customer metadata');
    return;
  }

  // Get current user prefs
  const userPrefs = await users.getPrefs(userId);
  const currentSubscription = userPrefs.subscription as SubscriptionData | undefined;

  // Mark subscription as canceled but keep limits until period end
  await users.updatePrefs(userId, {
    ...userPrefs,
    subscription: {
      ...currentSubscription,
      status: 'canceled',
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    },
  });

  console.log('Marked subscription as canceled:', userId);
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

  // Get userId from customer metadata
  const customer = await stripe.customers.retrieve(invoice.customer as string);

  if (customer.deleted) {
    console.error('Customer was deleted');
    return;
  }

  const userId = customer.metadata.userId;
  if (!userId) {
    console.error('No userId found in customer metadata');
    return;
  }

  // Get current user prefs
  const userPrefs = await users.getPrefs(userId);
  const currentSubscription = userPrefs.subscription as SubscriptionData | undefined;

  // Mark subscription as past_due
  await users.updatePrefs(userId, {
    ...userPrefs,
    subscription: {
      ...currentSubscription,
      status: 'past_due',
    },
  });

  console.log('Marked subscription as past_due:', userId);
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
