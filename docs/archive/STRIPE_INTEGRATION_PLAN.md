# Stripe Subscription Integration Plan

## Overview
Integrate Stripe billing to enforce subscription limits across 3 tiers:
1. **No plan** - Limited pre-signup experience
2. **Base plan** - Paid subscription with included limits
3. **Add-on limits** - User-purchased increases to base limits

## Subscription Limits Structure

### Base Plan: Koffers ($21.04/year)
- **3 institution connections** (Plaid items, not individual accounts)
- **10GB file storage**
- **Base AI chat tokens** (TBD - enough for onboarding + general questions)

### Add-ons (Quantity-based)
- **Additional Bank Connections**: $3.60/year per institution
- **Extra Vault Storage**: $12/year per 10GB
- **Additional AI Chat Tokens**: $14.40/year per 10K messages
- **Priority Support**: $60/year (toggle)

### No Plan Limits (Pre-signup / Unpaid)
- **Institution connections**: 0 (cannot connect banks until paid)
- **File storage**: 0 GB (cannot upload)
- **AI chat**: LIMITED (enough to answer questions, demo app, guide signup)
  - Estimated: ~20-30 messages to cover FAQs + onboarding
  - Purpose: Let chat sell the app, but require payment to actually use features

---

## Data Storage Strategy

### User Subscription Data (Appwrite `users` preferences)

Store subscription state in user preferences (`prefs`) as JSON:

```json
{
  "subscription": {
    "status": "active" | "canceled" | "past_due" | "none",
    "stripeCustomerId": "cus_xxx",
    "stripeSubscriptionId": "sub_xxx",
    "currentPeriodEnd": "2026-01-15T00:00:00Z",
    "limits": {
      "institutionConnections": 3,
      "storageGB": 10,
      "aiChatTokensPerMonth": 5000
    },
    "usage": {
      "institutionConnections": 2,
      "storageGB": 1.5,
      "aiChatTokensThisMonth": 1234,
      "aiChatTokensResetDate": "2025-12-01T00:00:00Z"
    }
  }
}
```

**Why user preferences?**
- Appwrite `prefs` supports JSON objects (~16KB limit - plenty for our needs)
- No need for separate subscription collection
- Easy to query and update
- Automatically scoped to userId

---

## Enforcement Points

### 1. Institution Connections (Plaid)

**File**: `app/api/plaid/exchange-token/route.ts`

**Current flow**:
```typescript
POST /api/plaid/exchange-token
→ Exchange public_token for access_token
→ Store in plaidItems collection
→ Fetch accounts
```

**Add limit check BEFORE storing**:
```typescript
// Get current user subscription
const userPrefs = await account.getPrefs();
const subscription = userPrefs.subscription || { limits: { institutionConnections: 0 }, usage: { institutionConnections: 0 } };

// Count existing institutions
const existingItems = await databases.listDocuments(
  DATABASE_ID,
  COLLECTIONS.PLAID_ITEMS,
  [Query.equal('userId', userId)]
);

const currentCount = existingItems.total;
const limit = subscription.limits.institutionConnections;

if (currentCount >= limit) {
  return Response.json({
    error: `Institution limit reached (${limit}). Upgrade your plan to connect more banks.`,
    upgradeUrl: '/dashboard/settings/billing'
  }, { status: 402 }); // 402 Payment Required
}

// Proceed with exchange...
```

**UI enforcement** (`components/plaid/plaid-link.tsx`):
- Show limit warning BEFORE opening Plaid Link
- Display "Upgrade" button when at limit

---

### 2. File Storage (Receipt uploads)

**File**: `app/api/files/upload/route.ts`

**Current flow**:
```typescript
POST /api/files/upload
→ Validate file
→ Upload to Appwrite storage
→ Create file document
```

**Add limit check**:
```typescript
// Get current storage usage
const userPrefs = await account.getPrefs();
const subscription = userPrefs.subscription || { limits: { storageGB: 0 }, usage: { storageGB: 0 } };

// Calculate current usage (could cache this in prefs and update incrementally)
const files = await databases.listDocuments(
  DATABASE_ID,
  COLLECTIONS.FILES,
  [Query.equal('userId', userId)]
);

const currentUsageBytes = files.documents.reduce((sum, f) => sum + f.fileSize, 0);
const currentUsageGB = currentUsageBytes / (1024 * 1024 * 1024);

// Check if adding this file would exceed limit
const newFileGB = formData.get('file').size / (1024 * 1024 * 1024);
const limit = subscription.limits.storageGB;

if (currentUsageGB + newFileGB > limit) {
  return Response.json({
    error: `Storage limit exceeded (${limit}GB). Delete files or upgrade your plan.`,
    currentUsage: currentUsageGB.toFixed(2),
    limit: limit,
    upgradeUrl: '/dashboard/settings/billing'
  }, { status: 402 });
}

// Proceed with upload...

// Update usage in prefs after successful upload
await account.updatePrefs({
  ...userPrefs,
  subscription: {
    ...userPrefs.subscription,
    usage: {
      ...userPrefs.subscription.usage,
      storageGB: (currentUsageBytes + formData.get('file').size) / (1024 * 1024 * 1024)
    }
  }
});
```

**Performance optimization**:
- Cache `storageGB` usage in user prefs
- Increment/decrement on upload/delete
- Recalculate periodically (daily cron job) to fix drift

---

### 3. AI Chat Tokens

**File**: `app/api/chat/route.ts`

**Current flow**:
```typescript
POST /api/chat
→ streamText() with Claude
→ Return stream
```

**Add token tracking**:
```typescript
// Get current user subscription
const userPrefs = await account.getPrefs();
const subscription = userPrefs.subscription || {
  status: 'none',
  limits: { aiChatTokensPerMonth: 20 }, // Free tier for pre-signup
  usage: { aiChatTokensThisMonth: 0, aiChatTokensResetDate: new Date().toISOString() }
};

// Check if usage period has reset
const now = new Date();
const resetDate = new Date(subscription.usage.aiChatTokensResetDate);
if (now > resetDate) {
  // Reset monthly usage
  subscription.usage.aiChatTokensThisMonth = 0;
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  subscription.usage.aiChatTokensResetDate = nextMonth.toISOString();
}

// Check if user has exceeded limit
const currentUsage = subscription.usage.aiChatTokensThisMonth;
const limit = subscription.limits.aiChatTokensPerMonth;

if (currentUsage >= limit) {
  return Response.json({
    error: subscription.status === 'none'
      ? 'Free chat limit reached. Subscribe to Koffers to continue chatting and unlock full features.'
      : `Monthly AI chat limit reached (${limit} messages). Upgrade to get more tokens.`,
    upgradeUrl: '/dashboard/settings/billing'
  }, { status: 402 });
}

// Create stream with token tracking
const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  system: `...`,
  messages: convertToModelMessages(messages),
  tools: { ... },
  onFinish: async ({ usage }) => {
    // Update token usage after stream completes
    const newUsage = currentUsage + 1; // Count by message, not tokens (simpler for users)

    await account.updatePrefs({
      ...userPrefs,
      subscription: {
        ...userPrefs.subscription,
        usage: {
          ...userPrefs.subscription.usage,
          aiChatTokensThisMonth: newUsage
        }
      }
    });

    console.log('Chat token usage:', {
      userId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      messagesUsed: newUsage,
      limit: limit
    });
  }
});

return result.toUIMessageStreamResponse();
```

**Token counting approach**:
- Count by **messages** not actual tokens (easier for users to understand)
- "10K messages" = 10,000 chat messages
- Free tier: 20-30 messages (enough to demo app)
- Base plan: 5,000 messages/month (generous for personal use)
- Add-on: +10,000 messages/month per $14.40/year

---

## Stripe Webhook Integration

**File**: `app/api/webhook/stripe/route.ts` (new)

Handle Stripe events to sync subscription status:

```typescript
import { stripe } from '@/lib/stripe';
import { databases, users } from '@/lib/appwrite-server';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      // Renew limits on successful payment
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      // Mark subscription as past_due
      await handlePaymentFailed(event.data.object);
      break;
  }

  return Response.json({ received: true });
}

async function handleSubscriptionUpdate(subscription: any) {
  // Get userId from Stripe customer metadata
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata.userId;

  // Calculate limits based on subscription items
  const items = subscription.items.data;
  let limits = {
    institutionConnections: 3, // Base plan
    storageGB: 10,
    aiChatTokensPerMonth: 5000
  };

  items.forEach((item: any) => {
    const productId = item.price.product;
    const quantity = item.quantity;

    // Map product IDs to limit increases
    if (productId === 'prod_BANK_ADDON') {
      limits.institutionConnections += quantity;
    } else if (productId === 'prod_STORAGE_ADDON') {
      limits.storageGB += quantity * 10;
    } else if (productId === 'prod_AI_ADDON') {
      limits.aiChatTokensPerMonth += quantity * 10000;
    }
  });

  // Update user prefs
  const userPrefs = await users.getPrefs(userId);
  await users.updatePrefs(userId, {
    ...userPrefs,
    subscription: {
      status: subscription.status,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      limits: limits,
      usage: userPrefs.subscription?.usage || {
        institutionConnections: 0,
        storageGB: 0,
        aiChatTokensThisMonth: 0,
        aiChatTokensResetDate: new Date().toISOString()
      }
    }
  });
}
```

---

## Checkout Flow

**File**: `app/dashboard/settings/billing/page.tsx`

Update the billing page to create Stripe checkout sessions:

```typescript
const handleSubscribe = async () => {
  const selectedAddons = addons.filter(a => a.enabled);

  // Create Stripe checkout session
  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceIds: [
        'price_koffers_base', // Base plan price ID
        ...selectedAddons.map(addon => ({
          price: addon.stripePriceId,
          quantity: addon.quantity || 1
        }))
      ]
    })
  });

  const { url } = await response.json();
  window.location.href = url; // Redirect to Stripe Checkout
};
```

**File**: `app/api/stripe/create-checkout-session/route.ts` (new)

```typescript
import { stripe } from '@/lib/stripe';
import { validateSession } from '@/lib/auth-helpers';

export async function POST(req: Request) {
  const { userId, user } = await validateSession();
  const { priceIds } = await req.json();

  // Create or retrieve Stripe customer
  let customerId = user.prefs?.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId }
    });
    customerId = customer.id;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: priceIds.map((item: any) => ({
      price: item.price,
      quantity: item.quantity || 1
    })),
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/settings/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/settings/billing?canceled=true`,
    metadata: { userId }
  });

  return Response.json({ url: session.url });
}
```

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create Stripe helper (`lib/stripe.ts`)
- [ ] Add Stripe webhook endpoint
- [ ] Update user prefs schema with subscription structure
- [ ] Add Stripe product/price IDs to environment variables

### Phase 2: Enforcement
- [ ] Add institution connection limit check to Plaid exchange
- [ ] Add file storage limit check to upload endpoint
- [ ] Add AI chat token tracking to chat endpoint
- [ ] Create upgrade UI components

### Phase 3: Checkout
- [ ] Create checkout session endpoint
- [ ] Update billing page with subscribe button
- [ ] Add success/cancel flows
- [ ] Test full subscription flow

### Phase 4: Management
- [ ] Add subscription cancellation
- [ ] Add upgrade/downgrade flows (with proration)
- [ ] Add usage dashboard UI
- [ ] Add billing portal link

---

## Wording: "Institution Connections" not "Bank Accounts"

✅ Use: "You have **2 of 3 institution connections** used"
❌ Avoid: "You have 2 of 3 bank accounts"

**Why?** One Plaid connection (e.g., Chase) can have multiple accounts (checking, savings, credit card). We charge per institution, not per individual account.

**UI Examples:**
- "Connect another institution" (button text)
- "3 institution connections included" (pricing table)
- "Additional institution connections: $3.60/year each" (add-on description)
- "Upgrade to connect more institutions" (limit warning)

---

## Next Steps

1. Review this plan with user
2. Create Stripe products in **production** (currently only in test)
3. Implement Phase 1 (foundation)
4. Test with test mode credentials
5. Deploy and switch to production Stripe keys
