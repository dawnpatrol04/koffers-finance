import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/appwrite-server';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia',
  });
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();

    // Parse body, handling empty bodies gracefully
    let body = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      // Empty body is fine, use defaults
    }

    const { addons = [] } = body;

    // Get authenticated user from session cookie
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build line items - always include base plan
    const lineItems = [
      {
        price: process.env.STRIPE_PRICE_BASE_PLAN!,
        quantity: 1,
      },
    ];

    // Add selected add-ons with quantities
    addons.forEach((addon: { id: string; quantity: number }) => {
      let priceId: string | undefined;

      switch (addon.id) {
        case 'extra-banks':
          priceId = process.env.STRIPE_PRICE_EXTRA_BANKS;
          break;
        case 'extra-storage':
          priceId = process.env.STRIPE_PRICE_EXTRA_STORAGE;
          break;
        case 'extra-ai-tokens':
          priceId = process.env.STRIPE_PRICE_EXTRA_AI_TOKENS;
          break;
        case 'priority-support':
          priceId = process.env.STRIPE_PRICE_EXTRA_SUPPORT;
          break;
      }

      if (priceId) {
        lineItems.push({
          price: priceId,
          quantity: addon.quantity || 1,
        });
      }
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?canceled=true`,
      customer_email: user.email,
      client_reference_id: user.$id,
      metadata: {
        userId: user.$id,
      },
      customer_creation: 'always',
      custom_fields: [],
      customer_update: {
        name: 'auto',
      },
      subscription_data: {
        metadata: {
          userId: user.$id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    // Include the actual error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
