# Stripe Subscription Implementation Roadmap

**Goal:** Implement subscription-based billing with usage limits for Koffers

**Strategy:** Build in phases, prioritize revenue-blocking work first, minimize user disruption

---

## Phase 1: Foundation (Highest Priority) ⭐⭐⭐
**Goal:** Get Stripe webhooks working and subscription data flowing
**Time:** 1 day
**Why First:** Everything else depends on this. No point building enforcement if subscription data isn't syncing.

### 1.1 Create Stripe Helper Library
**File:** `lib/stripe.ts`

```typescript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});
```

**Why:** Centralize Stripe client, use latest API version

---

### 1.2 Create Webhook Endpoint
**File:** `app/api/webhooks/stripe/route.ts`

**Handle these events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Logic:**
1. Verify webhook signature
2. Extract userId from Stripe customer metadata
3. Update Appwrite user prefs with subscription status + limits

**Why First:** This is the "source of truth" sync mechanism. Without this, nothing else works.

---

### 1.3 Initialize User Prefs Schema
**File:** `lib/subscription-helpers.ts`

```typescript
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'none';

export interface SubscriptionData {
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
  limits: {
    institutionConnections: number;
    storageGB: number;
    aiChatMessagesPerMonth: number;
  };
  usage: {
    institutionConnections: number;
    storageGB: number;
    aiChatMessagesThisMonth: number;
    aiChatMessagesResetDate: string;
  };
}

export const DEFAULT_NO_PLAN_LIMITS: SubscriptionData = {
  status: 'none',
  limits: {
    institutionConnections: 0,
    storageGB: 0,
    aiChatMessagesPerMonth: 30, // Free tier - enough to demo app
  },
  usage: {
    institutionConnections: 0,
    storageGB: 0,
    aiChatMessagesThisMonth: 0,
    aiChatMessagesResetDate: new Date().toISOString(),
  },
};

export const BASE_PLAN_LIMITS: SubscriptionData['limits'] = {
  institutionConnections: 3,
  storageGB: 10,
  aiChatMessagesPerMonth: 5000,
};
```

**Why:** Type safety + default limits in one place

---

### 1.4 Add Environment Variables
**File:** `.env.local`

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_51SLHeW9n3fCz6HZ6...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SLHeW9n3fCz6HZ6...
STRIPE_WEBHOOK_SECRET=whsec_... (get this after creating webhook in Stripe dashboard)

# Stripe Product Price IDs (from /tmp/create_stripe_products_v2.sh output)
STRIPE_PRICE_BASE_PLAN=price_xxx
STRIPE_PRICE_EXTRA_BANKS=price_xxx
STRIPE_PRICE_EXTRA_STORAGE=price_xxx
STRIPE_PRICE_EXTRA_AI_TOKENS=price_xxx
STRIPE_PRICE_PRIORITY_SUPPORT=price_xxx
```

**Why:** Need these IDs for checkout session creation

---

### ✅ Phase 1 Success Criteria:
- [ ] Webhook endpoint receiving events from Stripe
- [ ] User prefs updating when subscription changes in Stripe dashboard
- [ ] Can manually create subscription in Stripe and see limits update

**Testing:** Use Stripe CLI to trigger test webhooks:
```bash
stripe trigger customer.subscription.created
```

---

## Phase 2: AI Chat Limits (Next Priority) ⭐⭐⭐
**Goal:** Prevent unlimited free AI chat usage
**Time:** 4 hours
**Why Second:** This is your BIGGEST cost risk. AI tokens are expensive. Without limits, one user could rack up $100s in Claude API costs.

### 2.1 Add Token Tracking to Chat Endpoint
**File:** `app/api/chat/route.ts`

**Changes:**
1. Get user subscription from prefs
2. Check if user has exceeded monthly message limit
3. Return 402 if limit exceeded
4. Track usage in `onFinish` callback
5. Handle monthly reset logic

**Code location:** Around line 22-274 where `streamText()` is called

**Why Second:**
- ⚠️ **Cost protection** - This is your biggest expense
- 🎯 **Revenue driver** - Free tier chat will sell subscriptions
- 📊 **Easy to test** - Just send messages and check count

---

### ✅ Phase 2 Success Criteria:
- [ ] Free users limited to 30 messages/month
- [ ] Paid users get 5,000 messages/month
- [ ] Usage count increments after each message
- [ ] Monthly reset works correctly
- [ ] 402 error shows upgrade message when limit hit

**Testing:**
1. Create test user with no subscription
2. Send 31 messages
3. Verify 31st message blocked with upgrade prompt

---

## Phase 3: Institution Connection Limits ⭐⭐
**Goal:** Enforce bank connection limits (revenue-generating feature)
**Time:** 3 hours
**Why Third:** This directly impacts revenue (add-on purchases) but won't cause runaway costs like AI chat.

### 3.1 Add Limit Check to Plaid Exchange
**File:** `app/api/plaid/exchange-token/route.ts`

**Changes:**
1. Get user subscription from prefs
2. Count existing Plaid items for user
3. Check if adding new item would exceed limit
4. Return 402 if limit exceeded
5. Increment usage count after successful connection

**Logic:**
- No plan: 0 connections allowed (must subscribe)
- Base plan: 3 connections
- Each add-on: +1 connection

**Why Third:**
- 💰 **Revenue impact** - Drives add-on purchases
- ⏱️ **Low urgency** - Users don't connect banks frequently
- 🛡️ **Low abuse risk** - Plaid costs are fixed, not runaway

---

### 3.2 Update PlaidLink Component
**File:** `components/plaid/plaid-link.tsx`

**Changes:**
1. Fetch user subscription status
2. Show limit warning before opening Plaid Link
3. Display "Upgrade" button when at limit
4. Show "2 of 3 institution connections used" message

**Why:** Better UX - prevent users from going through Plaid flow only to hit limit at the end

---

### ✅ Phase 3 Success Criteria:
- [ ] Free users cannot connect banks (redirected to billing page)
- [ ] Paid users can connect up to their limit
- [ ] UI shows current usage (e.g., "2 of 3 institutions connected")
- [ ] Upgrade button appears when at limit
- [ ] Usage count increments when new bank connected

**Testing:**
1. Connect 3 banks on base plan
2. Try to connect 4th bank
3. Verify blocked with upgrade message

---

## Phase 4: Checkout Flow ⭐⭐
**Goal:** Let users actually subscribe and purchase add-ons
**Time:** 5 hours
**Why Fourth:** Needed for revenue, but previous phases create demand for it.

### 4.1 Create Checkout Session Endpoint
**File:** `app/api/stripe/create-checkout-session/route.ts`

**Logic:**
1. Get current user
2. Create or retrieve Stripe customer (store customerId in metadata)
3. Build line items from selected add-ons
4. Create checkout session
5. Return session URL

**Example:**
```typescript
const session = await stripe.checkout.sessions.create({
  customer: customerId,
  mode: 'subscription',
  line_items: [
    { price: process.env.STRIPE_PRICE_BASE_PLAN, quantity: 1 },
    { price: process.env.STRIPE_PRICE_EXTRA_BANKS, quantity: 2 }, // 2 extra banks
  ],
  success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/settings/billing?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/settings/billing?canceled=true`,
  metadata: { userId },
});
```

---

### 4.2 Update Billing Page Subscribe Button
**File:** `components/billing/plans.tsx`

**Changes:**
1. Update `handleSubscribe()` to call checkout session endpoint
2. Redirect to Stripe Checkout
3. Handle success/cancel redirects

**Current code location:** Line 95-105

---

### 4.3 Add Success/Cancel Pages
**Files:**
- `app/dashboard/settings/billing/page.tsx`

**Changes:**
1. Check URL params for `?success=true` or `?canceled=true`
2. Show success message: "Subscription activated! Limits updated."
3. Show cancel message: "Payment canceled. Try again anytime."

---

### ✅ Phase 4 Success Criteria:
- [ ] User can click "Subscribe to Koffers" and redirect to Stripe
- [ ] After payment, user returns to billing page with success message
- [ ] Subscription appears in Stripe dashboard
- [ ] Webhook fires and updates user prefs
- [ ] User can immediately use new limits (connect banks, etc.)

**Testing:**
1. Use Stripe test card: 4242 4242 4242 4242
2. Complete checkout
3. Verify subscription created
4. Verify limits updated in Appwrite

---

## Phase 5: File Storage Limits ⭐
**Goal:** Enforce vault storage limits
**Time:** 4 hours
**Why Fifth:** Low urgency - storage costs are negligible, users won't hit 10GB quickly.

### 5.1 Add Storage Usage Tracking
**File:** `app/api/files/upload/route.ts`

**Changes:**
1. Get user subscription from prefs
2. Calculate current storage usage (sum all file sizes)
3. Check if new file would exceed limit
4. Return 402 if limit exceeded
5. Update usage in prefs after successful upload

**Optimization:**
- Cache `storageGB` in user prefs
- Increment on upload, decrement on delete
- Add daily cron job to recalculate and fix drift

---

### 5.2 Add File Delete Handler
**File:** `app/api/files/[fileId]/route.ts` (if doesn't exist, create it)

**Changes:**
1. Delete file from Appwrite storage
2. Decrement storage usage in user prefs

---

### ✅ Phase 5 Success Criteria:
- [ ] Storage usage tracked in user prefs
- [ ] Upload blocked when limit exceeded
- [ ] Usage decreases when file deleted
- [ ] UI shows "1.5 GB of 10 GB used"

**Testing:**
1. Upload files until close to 10GB
2. Try to upload file that exceeds limit
3. Verify blocked with upgrade message

---

## Phase 6: Subscription Management ⭐
**Goal:** Let users upgrade, downgrade, cancel
**Time:** 6 hours
**Why Last:** Users need to subscribe first before they can manage subscriptions.

### 6.1 Add Stripe Customer Portal Link
**File:** `app/dashboard/settings/billing/page.tsx`

**Logic:**
1. Create Stripe billing portal session
2. Redirect user to Stripe-hosted portal
3. User can update payment method, cancel subscription, view invoices

**Code:**
```typescript
const session = await stripe.billingPortal.sessions.create({
  customer: user.prefs.subscription.stripeCustomerId,
  return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/settings/billing`,
});

window.location.href = session.url;
```

**Why:** Let Stripe handle the complex stuff (payment methods, invoices, cancellation)

---

### 6.2 Add Upgrade/Downgrade Flow
**File:** `app/api/stripe/update-subscription/route.ts`

**Logic:**
1. Get current subscription from Stripe
2. Add or remove add-on items
3. Set proration behavior:
   - Upgrades: `proration_behavior: 'always_invoice'` (charge immediately)
   - Downgrades: `proration_behavior: 'none'` (apply next billing cycle)

---

### 6.3 Handle Cancellation
**Webhook event:** `customer.subscription.deleted`

**Logic:**
1. Set subscription status to 'canceled'
2. Keep limits until `current_period_end`
3. After period ends, revert to free tier limits (0 banks, 0 storage, 30 AI messages)

---

### ✅ Phase 6 Success Criteria:
- [ ] User can click "Manage Subscription" and access Stripe portal
- [ ] User can upgrade add-ons (immediately provisioned)
- [ ] User can downgrade add-ons (applied next billing cycle)
- [ ] User can cancel (access until period end, then free tier)

---

## Phase 7: Polish & Monitoring 🎨
**Goal:** Production-ready refinements
**Time:** 4 hours
**Why Last:** Nice-to-haves that improve UX but aren't blocking.

### 7.1 Add Usage Dashboard UI
**File:** `app/dashboard/settings/billing/page.tsx`

**Features:**
- Progress bars for each limit
- "2 of 3 institution connections used"
- "1,234 of 5,000 AI messages used this month (resets Dec 1)"
- "1.5 GB of 10 GB storage used"

---

### 7.2 Add Limit Warning Toasts
**Trigger:** When user reaches 80% of any limit

**Message examples:**
- "You've used 4,000 of 5,000 AI messages this month. Upgrade to avoid interruptions."
- "You've used 8GB of 10GB storage. Consider adding more storage."

---

### 7.3 Add Webhook Logging
**File:** Create `lib/webhook-logger.ts`

**Purpose:**
- Log all webhook events to Appwrite database
- Debug failed webhooks
- Track subscription lifecycle

**Schema:**
```typescript
{
  eventId: string;
  eventType: string;
  userId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}
```

---

### 7.4 Add Error Monitoring
**Service:** Sentry (if you use it)

**Track:**
- Failed webhook processing
- Failed limit checks
- Failed Stripe API calls

---

### ✅ Phase 7 Success Criteria:
- [ ] Users can see real-time usage stats
- [ ] Users get proactive warnings before hitting limits
- [ ] All webhooks logged for debugging
- [ ] Errors tracked in monitoring service

---

## Summary Timeline

| Phase | Focus | Time | Priority | Why |
|-------|-------|------|----------|-----|
| **1** | Foundation (webhooks, prefs) | 1 day | ⭐⭐⭐ | Everything depends on this |
| **2** | AI Chat Limits | 4 hours | ⭐⭐⭐ | Biggest cost risk |
| **3** | Bank Connection Limits | 3 hours | ⭐⭐ | Revenue driver |
| **4** | Checkout Flow | 5 hours | ⭐⭐ | Users need to pay |
| **5** | Storage Limits | 4 hours | ⭐ | Low urgency, low cost |
| **6** | Subscription Management | 6 hours | ⭐ | Users must subscribe first |
| **7** | Polish & Monitoring | 4 hours | 🎨 | Nice-to-have |

**Total Time:** ~3 days

---

## Pre-Implementation Checklist

Before starting Phase 1:

- [ ] Stripe products created (✅ Already done in test mode)
- [ ] Stripe test credentials saved (✅ Already done in Trestles)
- [ ] Price IDs added to `.env.local`
- [ ] Stripe webhook endpoint configured in Stripe dashboard
- [ ] Webhook secret added to `.env.local`
- [ ] `stripe` npm package installed

---

## Post-Implementation Checklist

Before switching to production:

- [ ] All 7 phases complete and tested
- [ ] Create Stripe products in **production mode** (not test)
- [ ] Update `.env.production` with production keys
- [ ] Configure production webhook endpoint in Stripe
- [ ] Test full subscription flow in production
- [ ] Monitor webhooks for 1 week to ensure stability

---

## Rollout Strategy

**Option A: Big Bang (All at once)**
- ✅ Simpler deployment
- ❌ Higher risk if something breaks
- **Use if:** You're confident in testing

**Option B: Feature Flag (Gradual)**
- ✅ Lower risk
- ✅ Can test with beta users first
- ❌ More complex to manage
- **Use if:** You want to test with small group first

**Recommended:** Option A (big bang) because:
- Only 3 days of work total
- Can test thoroughly in staging
- Not that many moving parts

---

## What Could Go Wrong?

**Risk 1: Webhook failures**
- **Mitigation:** Stripe retries for 3 days, log all events, add fallback sync job

**Risk 2: User prefs conflicts**
- **Mitigation:** Use Appwrite's built-in conflict resolution, always read before write

**Risk 3: Limit calculation drift**
- **Mitigation:** Add daily cron job to recalculate usage from source of truth

**Risk 4: Token usage spikes**
- **Mitigation:** Set Anthropic API spending limits in Anthropic Console

---

## Next Steps

1. **Review this roadmap** - Confirm priority order makes sense
2. **Start Phase 1** - Set up webhooks and get subscription data flowing
3. **Test each phase** before moving to next
4. **Ship to production** after Phase 7 complete

**Ready to start Phase 1?**
