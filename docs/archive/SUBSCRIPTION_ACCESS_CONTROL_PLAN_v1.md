# Subscription Access Control - Complete Implementation Plan

## 1. High-Level Business Logic

### User States & Access Levels

#### State 1: Brand New User (No Payment, Just Signed Up)
**Access Allowed:**
- ✅ Browse entire UI/dashboard (read-only exploration)
- ✅ View billing/pricing pages
- ✅ Limited LLM chat tokens (e.g., 30 messages for Q&A about the app)
- ✅ View demo data/screenshots
- ✅ Access account settings

**Access Denied:**
- ❌ Connect bank accounts (Plaid)
- ❌ Upload receipts/files
- ❌ Create/edit transactions
- ❌ Full LLM features (beyond free allowance)
- ❌ Export data

**Goal:** Let them explore and ask questions via LLM before committing to payment

---

#### State 2: Active Paying Subscriber
**Access Allowed:**
- ✅ Everything - full feature access
- ✅ Connect up to plan limit banks
- ✅ Full LLM chat (5000 messages/month base plan)
- ✅ Upload receipts
- ✅ All transaction features
- ✅ Data export
- ✅ All dashboard features

---

#### State 3: Canceled Subscription (Still in Current Period)
**Status:** `canceled` in Stripe, but `current_period_end` hasn't passed yet

**Access Allowed:**
- ✅ **Full access until period ends** (they paid for the month)
- ✅ All features work normally

**UI Changes:**
- ⚠️ Show banner: "Your subscription will end on [date]. Reactivate to continue access."
- ⚠️ Billing page shows "Reactivate Subscription" button

---

#### State 4: Expired Subscription (After Current Period Ended)
**Status:** `canceled` + `current_period_end` < now

**Access Allowed:**
- ✅ View existing data (read-only)
- ✅ Export all data (CSV, JSON)
- ✅ Disconnect bank accounts
- ✅ Delete account
- ✅ Access billing page to resubscribe
- ✅ Limited navigation (view transaction history, view accounts)

**Access Denied:**
- ❌ Connect new banks
- ❌ Upload new receipts
- ❌ Create/edit transactions
- ❌ LLM chat (even free tier - they had access, now expired)
- ❌ Refresh Plaid data

**Goal:** Let them clean up / export data, but can't use active features

---

#### State 5: Past Due Payment
**Status:** `past_due` in Stripe

**Access Allowed:**
- ✅ Same as State 4 (expired) - read-only access
- ✅ Update payment method
- ✅ View billing page

**UI Changes:**
- 🔴 Red banner: "Payment failed. Update your payment method to restore access."
- Billing page prominently shows "Update Payment Method"

---

### Industry Standards (Based on Research)

1. **Grace Period**: 30-90 days is standard
   - Microsoft: 90 days
   - Azure: 30-90 days
   - Google Workspace: 51 days to resubscribe

2. **Data Retention After Cancellation**:
   - Minimum 7 days (Stripe partners)
   - Standard: 30-90 days
   - We'll do: **90 days** before data deletion

3. **Immediate vs. Period-End Cancellation**:
   - Standard: Access continues until end of billing period
   - Users expect to get what they paid for

4. **Freemium Conversion**:
   - 30 free LLM messages for new users
   - Industry average freemium conversion: 5%
   - Free trial conversion: 17-25%

---

## 2. Technical Implementation Strategy

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  User Request → Server Component → Check Sub       │
│                                                     │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ Page.tsx     │──────│ Subscription │            │
│  │ (Server)     │      │ Check Helper │            │
│  └──────────────┘      └──────────────┘            │
│         │                      │                    │
│         │                      ↓                    │
│         │              ┌──────────────┐             │
│         │              │   Appwrite   │             │
│         │              │  Subscr. DB  │             │
│         │              └──────────────┘             │
│         ↓                                           │
│  Access Granted/Denied                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Why NOT Middleware

❌ **Middleware runs on Edge Runtime**
- Cannot use `node-appwrite` SDK
- Cannot query databases directly
- Would require REST API calls (complex, fragile)

✅ **Server Components Instead**
- Run on Node.js runtime
- Can use full Appwrite SDK
- Easy database queries
- Per-page granular control

---

### Implementation Pattern

#### Option A: Page-Level Guards (RECOMMENDED)

Each protected page checks subscription at the top:

```typescript
// app/dashboard/transactions/page.tsx
import { redirect } from 'next/navigation';
import { checkSubscriptionAccess } from '@/lib/subscription-check';

export default async function TransactionsPage() {
  const { hasAccess, reason, subscription } = await checkSubscriptionAccess();

  // Check if user can access this specific feature
  if (!hasAccess) {
    redirect(`/dashboard/settings/billing?reason=${reason}&redirect=/dashboard/transactions`);
  }

  return <TransactionsContent subscription={subscription} />;
}
```

**Pros:**
- Works with Server Components
- Granular control per feature
- Can pass subscription data to component
- Easy to test

**Cons:**
- Must add to each page
- Slight delay before redirect (page starts loading)

---

#### Option B: Higher-Order Component Pattern

Create a reusable wrapper:

```typescript
// lib/with-subscription.tsx
export function withSubscriptionCheck(
  Component: React.ComponentType<any>,
  requiredFeature?: 'banks' | 'llm' | 'receipts'
) {
  return async function SubscriptionGuard(props: any) {
    const { hasAccess, reason, subscription } = await checkSubscriptionAccess();

    // Feature-specific checks
    if (requiredFeature === 'banks' && subscription.currentBanksConnected >= subscription.maxBanks) {
      redirect('/dashboard/settings/billing?reason=max_banks');
    }

    if (!hasAccess) {
      redirect(`/dashboard/settings/billing?reason=${reason}`);
    }

    return <Component {...props} subscription={subscription} />;
  };
}

// Usage:
export default withSubscriptionCheck(TransactionsPage, 'banks');
```

**Pros:**
- DRY (Don't Repeat Yourself)
- Consistent enforcement
- Easy to add feature-specific logic

**Cons:**
- More abstraction
- Harder to debug

---

### Subscription Data Model

```typescript
interface SubscriptionStatus {
  // From Stripe webhook
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  currentPeriodEnd: string; // ISO date

  // Limits (from base plan + add-ons)
  maxBanks: number;
  maxChatsPerMonth: number;
  maxStorageGB: number;

  // Current usage
  currentBanksConnected: number;
  currentChatsUsed: number;
  currentStorageUsedGB: number;

  // Add-ons
  addonBanks: number;
  addonChats: number;
  addonStorage: number;
}
```

---

### Access Control Logic

```typescript
export async function checkSubscriptionAccess() {
  const user = await getCurrentUser();
  if (!user) return { hasAccess: false, reason: 'not_authenticated' };

  const subscription = await getSubscription(user.$id);

  // No subscription = new user = limited access
  if (!subscription) {
    return {
      hasAccess: true, // Allow exploration
      isLimited: true, // Flag for UI
      freeTokens: 30,
      reason: 'no_subscription'
    };
  }

  // Active or trialing = full access
  if (['active', 'trialing'].includes(subscription.status)) {
    return { hasAccess: true, subscription };
  }

  // Canceled but still in paid period = full access
  if (subscription.status === 'canceled') {
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const now = new Date();

    if (now < periodEnd) {
      return {
        hasAccess: true,
        isEnding: true, // Show warning banner
        endsAt: subscription.currentPeriodEnd,
        subscription
      };
    }

    // Period ended = read-only access
    return {
      hasAccess: false,
      readOnly: true, // Special flag
      reason: 'subscription_expired',
      subscription
    };
  }

  // Past due = read-only access
  if (subscription.status === 'past_due') {
    return {
      hasAccess: false,
      readOnly: true,
      reason: 'subscription_past_due',
      subscription
    };
  }

  return { hasAccess: false, reason: 'subscription_inactive' };
}
```

---

## 3. Feature-Level Access Matrix

| Feature | New User | Active Sub | Canceled (In Period) | Expired | Past Due |
|---------|----------|------------|---------------------|---------|----------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ (read-only) | ✅ (read-only) |
| Connect Banks | ❌ | ✅ | ✅ | ❌ | ❌ |
| View Transactions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Transactions | ❌ | ✅ | ✅ | ❌ | ❌ |
| LLM Chat | ✅ (30 msg) | ✅ (5000/mo) | ✅ (5000/mo) | ❌ | ❌ |
| Upload Receipts | ❌ | ✅ | ✅ | ❌ | ❌ |
| Export Data | ❌ | ✅ | ✅ | ✅ | ✅ |
| Disconnect Banks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete Account | ✅ | ✅ | ✅ | ✅ | ✅ |
| Refresh Plaid Data | ❌ | ✅ | ✅ | ❌ | ❌ |

---

## 4. Stripe Testing Commands

### Get Current Test Subscription ID

From the shell script you already have:
```bash
curl -s https://api.stripe.com/v1/subscriptions/sub_1STYvB5pSNA06eeCoFx0i7FW \
  -u sk_test_YOUR_STRIPE_SECRET_KEY: \
  | jq '{id, status, cancel_at_period_end, canceled_at, current_period_end}'
```

### Cancel Subscription IMMEDIATELY (for testing)

```bash
# Cancel now (not at period end)
stripe subscriptions cancel sub_1STYvB5pSNA06eeCoFx0i7FW

# Or with curl:
curl -X DELETE https://api.stripe.com/v1/subscriptions/sub_1STYvB5pSNA06eeCoFx0i7FW \
  -u sk_test_YOUR_STRIPE_SECRET_KEY:
```

### Cancel at Period End (normal user flow)

```bash
# Cancel but let them keep access until period ends
stripe subscriptions update sub_1STYvB5pSNA06eeCoFx0i7FW \
  --cancel-at-period-end=true

# Or with curl:
curl -X POST https://api.stripe.com/v1/subscriptions/sub_1STYvB5pSNA06eeCoFx0i7FW \
  -u sk_test_YOUR_STRIPE_SECRET_KEY: \
  -d cancel_at_period_end=true
```

### Reactivate a Canceled Subscription

```bash
# Undo the cancellation (before period ends)
stripe subscriptions update sub_1STYvB5pSNA06eeCoFx0i7FW \
  --cancel-at-period-end=false

# Or with curl:
curl -X POST https://api.stripe.com/v1/subscriptions/sub_1STYvB5pSNA06eeCoFx0i7FW \
  -u sk_test_YOUR_STRIPE_SECRET_KEY: \
  -d cancel_at_period_end=false
```

### Simulate Past Due (Payment Failed)

```bash
# Update subscription to past_due status
curl -X POST https://api.stripe.com/v1/subscriptions/sub_1STYvB5pSNA06eeCoFx0i7FW \
  -u sk_test_YOUR_STRIPE_SECRET_KEY: \
  -d "items[0][id]=si_xxx" \
  -d "items[0][price]=price_xxx"

# Note: In test mode, you can't directly set status to past_due
# Instead, use Stripe test cards that decline payments:
# 4000000000000341 - Card is declined
```

### List All Subscriptions for Testing

```bash
stripe subscriptions list --limit 10

# Or get specific customer's subscriptions:
stripe subscriptions list --customer cus_xxxxx
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Already Done ✅)
- [x] `lib/subscription-check.ts` helper created
- [x] Billing page shows access denied messages
- [x] Stripe webhook handles subscription updates

### Phase 2: Access Control Logic (Next)
1. Update `checkSubscriptionAccess()` to handle all 5 user states
2. Add free token tracking for new users
3. Add read-only mode for expired subscriptions
4. Add warning banner logic for ending subscriptions

### Phase 3: Page-Level Enforcement
1. Add subscription checks to:
   - `/dashboard/page.tsx` - Allow new users, show limited UI
   - `/dashboard/transactions/page.tsx` - Block creation/editing for non-paying
   - `/dashboard/chat/page.tsx` - Enforce token limits
   - `/dashboard/settings/accounts/page.tsx` - Block new connections for non-paying
   - `/dashboard/files/page.tsx` - Block uploads for non-paying

2. Create reusable HOC pattern (`withSubscriptionCheck`)

### Phase 4: UI Enhancements
1. Add subscription status banners:
   - Green: Active subscription
   - Yellow: Ending soon (canceled, in period)
   - Red: Expired or past due

2. Update navigation to show locked features
3. Add upgrade prompts for new users
4. Show token usage in chat interface

### Phase 5: API Route Protection
1. Protect write operations in API routes
2. Allow read operations for expired users
3. Enforce token limits in LLM API

### Phase 6: Testing & Validation
1. Test all 5 user states with Stripe CLI
2. Verify webhook handling for each transition
3. Test edge cases (grace period, reactivation)

---

## 6. Next Steps (Prioritized)

1. **Update `lib/subscription-check.ts`** with full logic for all 5 states
2. **Test Stripe CLI commands** and document in a testing guide
3. **Implement dashboard page guard** as proof-of-concept
4. **Add free token tracking** to Appwrite subscriptions collection
5. **Create reusable HOC** for subscription checking
6. **Roll out to all pages** systematically

---

## Questions to Resolve

1. **Free Token Reset**: Should new users get 30 tokens one-time or monthly?
2. **Grace Period**: 30, 60, or 90 days before data deletion?
3. **Expired User Navigation**: Full UI visible but disabled, or hide features entirely?
4. **Past Due Retry**: How many payment retry attempts before hard lockout?
5. **Reactivation Flow**: New subscription or reactivate old one?

