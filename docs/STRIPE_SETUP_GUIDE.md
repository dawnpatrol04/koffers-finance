# Stripe Setup Guide - Complete These Steps

## Step 1: Get Stripe Product & Price IDs

We created 5 products earlier. Now we need to get their IDs.

### Option A: Via Stripe Dashboard (Easier)

1. Go to https://dashboard.stripe.com/test/products
2. Click on each product and copy:
   - **Product ID** (starts with `prod_`)
   - **Price ID** (starts with `price_`)

### Option B: Via Stripe CLI (Faster)

```bash
# List all products with their prices
stripe products list --limit 10

# Or get specific product details
stripe products retrieve prod_xxx
```

You need IDs for:
- Koffers (base plan)
- Additional Bank Connections
- Extra Vault Storage (10GB)
- Additional AI Chat Tokens (10K messages)
- Priority Support

---

## Step 2: Create `.env.local` File

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in these values:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=<STRIPE_SECRET_KEY>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SLHeW9n3fCz6HZ6... (get from Stripe dashboard)

# Leave this empty for now - we'll get it after creating webhook
STRIPE_WEBHOOK_SECRET=

# Product IDs (get from Stripe dashboard - starts with prod_)
STRIPE_PRODUCT_BASE_PLAN=prod_xxx
STRIPE_PRODUCT_EXTRA_BANKS=prod_xxx
STRIPE_PRODUCT_EXTRA_STORAGE=prod_xxx
STRIPE_PRODUCT_EXTRA_AI_TOKENS=prod_xxx
STRIPE_PRODUCT_PRIORITY_SUPPORT=prod_xxx

# Price IDs (get from Stripe dashboard - starts with price_)
STRIPE_PRICE_BASE_PLAN=price_xxx
STRIPE_PRICE_EXTRA_BANKS=price_xxx
STRIPE_PRICE_EXTRA_STORAGE=price_xxx
STRIPE_PRICE_EXTRA_AI_TOKENS=price_xxx
STRIPE_PRICE_PRIORITY_SUPPORT=price_xxx
```

**Note:** The test secret key is already in Trestles project secrets. Just need to add it to .env.local.

---

## Step 3: Set Up Webhook Endpoint

### For Local Testing (Development):

1. Install Stripe CLI if you haven't:
```bash
brew install stripe/stripe-cli/stripe
```

2. Login to Stripe:
```bash
stripe login
```

3. Forward webhooks to local server:
```bash
stripe listen --forward-to localhost:3002/api/webhooks/stripe
```

4. Copy the webhook signing secret that appears (starts with `whsec_`)
5. Add it to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### For Production:

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "+ Add endpoint"
3. Enter URL: `https://koffers.ai/api/webhooks/stripe`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click "Add endpoint"
6. Click "Reveal" next to "Signing secret"
7. Copy the secret (starts with `whsec_`)
8. Add to Vercel environment variables

---

## Step 4: Test the Webhook

### Local Testing:

1. Make sure dev server is running: `npm run dev`
2. Make sure Stripe CLI is forwarding: `stripe listen --forward-to localhost:3002/api/webhooks/stripe`
3. Trigger test event:
```bash
stripe trigger customer.subscription.created
```

4. Check console logs - you should see:
```
Received Stripe webhook event: customer.subscription.created
Processing subscription update: sub_xxx
Updated user subscription: [userId] {limits}
```

### Production Testing:

1. Go to Stripe dashboard > Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select `customer.subscription.created`
5. Click "Send test webhook"
6. Check the "Logs" tab to see if it succeeded

---

## Step 5: Verify User Prefs Update

After triggering a test webhook:

1. Go to Appwrite Console
2. Navigate to Users
3. Find the test user
4. Check user preferences - should see:
```json
{
  "subscription": {
    "status": "active",
    "stripeCustomerId": "cus_xxx",
    "stripeSubscriptionId": "sub_xxx",
    "currentPeriodEnd": "2026-01-15T00:00:00Z",
    "limits": {
      "institutionConnections": 3,
      "storageGB": 10,
      "aiChatMessagesPerMonth": 5000
    },
    "usage": {
      "institutionConnections": 0,
      "storageGB": 0,
      "aiChatMessagesThisMonth": 0,
      "aiChatMessagesResetDate": "2025-12-01T00:00:00Z"
    }
  }
}
```

---

## Troubleshooting

### Webhook signature verification failed
- Make sure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe dashboard
- For local testing, make sure you're using the secret from `stripe listen` output

### "No userId found in customer metadata"
- When creating test subscriptions, make sure customer has metadata: `{ userId: "xxx" }`
- We'll handle this in the checkout flow (Phase 4)

### TypeScript errors
- Make sure all Stripe types are imported correctly
- Run `npm run build` to check for errors

---

## Next: Phase 2 - AI Chat Limits

Once webhooks are working and user prefs are updating, we can move to Phase 2:
- Add token tracking to `/app/api/chat/route.ts`
- Enforce 30 message limit for free users
- Enforce 5,000 message limit for paid users
- Track usage in `onFinish` callback
