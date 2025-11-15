# Subscription Access Control - v2 (Research-Backed Implementation)

**Last Updated**: November 15, 2025
**Status**: Active Implementation Plan
**Research Sources**: Stripe Official Docs, Plaid Compliance Guidelines, SaaS Industry Standards

---

## 🎯 Executive Summary

This document outlines Koffers' subscription-based access control system based on:
1. **Stripe's actual subscription lifecycle** (not assumptions)
2. **Plaid compliance requirements** (cost + data minimization)
3. **Your business requirements** (demo mode, add-ons, graceful degradation)

### Key Decisions Made:
- ✅ Demo data for new users (not empty dashboards)
- ✅ Add-on based limits (not just active/inactive)
- ✅ 7-day grace period during payment retries
- ✅ Auto-disconnect Plaid when subscription ends (compliance + cost)
- ✅ 90-day data retention before deletion
- ❌ No separate "canceled" permission state (just a banner)

---

## 📊 User States (The 4 We Actually Need)

### State 1: Demo User (No Subscription)

**Stripe Status**: `null` (no subscription record exists)

**What They See**:
```typescript
{
  banks: [
    { name: "Chase Checking (Demo)", balance: 5420.50, type: "checking" },
    { name: "Wells Fargo Savings (Demo)", balance: 12350.00, type: "savings" },
    { name: "Amex Credit Card (Demo)", balance: -1245.30, type: "credit" }
  ],
  transactions: [
    // Last 90 days of realistic demo transactions
    // Grocery stores, gas stations, recurring bills, etc.
  ],
  receipts: [
    // 5-10 sample receipt images with OCR data
  ]
}
```

**Access Allowed**:
- ✅ Full UI exploration (all pages visible)
- ✅ Dashboard with demo charts/graphs (Cash Flow, Net Worth, etc.)
- ✅ LLM Chat: 30 messages to ask questions ABOUT the app using demo data
- ✅ View Settings pages
- ✅ Access Billing page to subscribe

**Access Denied**:
- ❌ Connect REAL bank accounts (Plaid button shows "Subscribe to connect banks")
- ❌ Upload REAL receipts/files
- ❌ Create/edit REAL transactions
- ❌ Export data (nothing real to export)
- ❌ Full LLM features beyond 30 messages

**UI Indicators**:
- Floating banner: "You're viewing demo data. Subscribe to connect your real accounts →"
- Bank accounts marked with "(Demo)" badge
- Subtle watermark on dashboards: "Demo Mode"

**Goal**: Let users fully understand the value proposition before paying.

---

### State 2: Active Subscriber (Paying Customer)

**Stripe Status**: `active` or `trialing`

**Subscription Structure**:
```typescript
interface SubscriptionLimits {
  // Base Plan (Starter $10/mo)
  basePlan: {
    banks: 1,
    chatsPerMonth: 5000,
    storageGB: 1
  },

  // Add-ons (purchased separately)
  addons: {
    extraBanks: number,      // $5/mo per bank
    extraChats: number,      // $10/mo per 5000 messages
    extraStorageGB: number   // $5/mo per 10GB
  },

  // Calculated totals
  maxBanks: basePlan.banks + addons.extraBanks,
  maxChatsPerMonth: basePlan.chatsPerMonth + addons.extraChats,
  maxStorageGB: basePlan.storageGB + addons.extraStorageGB
}

interface CurrentUsage {
  banksConnected: number,
  chatsUsedThisMonth: number,
  storageUsedGB: number
}
```

**Access Allowed**:
- ✅ Full feature access
- ✅ Connect banks (up to `maxBanks` limit)
- ✅ Upload receipts (up to `maxStorageGB` limit)
- ✅ LLM chat (up to `maxChatsPerMonth` limit)
- ✅ All transaction features
- ✅ Data export (CSV, JSON)
- ✅ All dashboard features

**Limit Enforcement**:
```typescript
// Example: User tries to connect 2nd bank but only has 1 allowed
if (currentUsage.banksConnected >= limits.maxBanks) {
  showUpgradeModal({
    title: "Bank Connection Limit Reached",
    message: `You've connected ${limits.maxBanks}/${limits.maxBanks} banks.
              Add more bank connections for $5/mo each.`,
    cta: "Upgrade Plan",
    ctaLink: "/dashboard/settings/billing?addon=banks"
  });
}
```

**Monthly Reset**:
- `chatsUsedThisMonth` resets to 0 on billing cycle renewal
- `storageUsedGB` does NOT reset (cumulative)
- `banksConnected` does NOT reset (cumulative)

**UI Indicators**:
- Settings > Usage: Shows `2/5 banks connected`, `3245/5000 chats used`, `0.8/1.0 GB storage`
- Progress bars for each limit
- "Add more" buttons next to each limit

---

### State 3: Past Due (Payment Failed, Retrying - Days 0-7)

**Stripe Status**: `past_due`

**What's Happening Behind the Scenes**:
```
Day 0 (10:00 AM): Payment fails (card expired, insufficient funds, etc.)
                  → Stripe sets status = 'past_due'
                  → Send email: "Payment failed, we'll retry tomorrow"

Day 1 (10:00 AM): Stripe Smart Retry #1
                  → If succeeds: Back to 'active'
                  → If fails: Send email: "Still failing, will retry in 2 days"

Day 3 (10:00 AM): Stripe Smart Retry #2
                  → If fails: Send email: "Last retry in 2 days"

Day 5 (10:00 AM): Stripe Smart Retry #3
                  → If fails: Send email: "Final retry tomorrow"

Day 7 (10:00 AM): Stripe Smart Retry #4 (FINAL)
                  → If fails: Auto-cancel subscription + disconnect Plaid
                  → Send email: "Subscription ended, banks disconnected"
```

**Access Allowed** (During Days 0-7):
- ✅ **Full access continues!** (good UX during grace period)
- ✅ All features work normally
- ✅ Can update payment method (Stripe auto-retries when updated)

**Access Denied**:
- None! They still have full access during retry window.

**UI Indicators**:
- 🟡 Yellow banner: "Payment failed. We'll retry automatically, or update your payment method now."
- Billing page prominently shows: "Update Payment Method" button
- Show next retry date: "Next retry: Nov 16, 10:00 AM"

**Auto-Recovery**:
- If user updates payment method, Stripe immediately retries all unpaid invoices
- If retry succeeds, status → `active` (no manual intervention needed)

**Goal**: Give users 7 days to fix payment issues without losing access.

---

### State 4: Expired/Locked (Subscription Ended)

**Stripe Status**: `canceled` or `unpaid`
**Condition**: `current_period_end < Date.now()` (period has ended)

**How They Got Here**:
1. User manually canceled → waited for period to end
2. Payment failed → all retries exhausted (Day 7+)
3. User's trial ended without payment method

**Access Allowed** (Read-Only Mode):
- ✅ View existing transactions (read-only list)
- ✅ View existing bank accounts (balances shown, no refresh)
- ✅ View existing receipts/files
- ✅ Export ALL data (CSV, JSON, ZIP of files)
- ✅ Access Billing page to resubscribe
- ✅ Delete account permanently

**Access Denied**:
- ❌ Connect new banks (Plaid already disconnected)
- ❌ Refresh existing bank data (Plaid Items removed)
- ❌ Upload new receipts
- ❌ Create/edit transactions
- ❌ LLM chat (not even demo allowance)
- ❌ View live dashboards (charts show "Subscribe to see live data")

**Automatic Actions Taken** (Triggered on Day 7 or when period ends):
```typescript
async function handleSubscriptionExpired(userId: string) {
  // 1. Disconnect ALL Plaid bank connections
  const plaidItems = await getPlaidItems(userId);
  for (const item of plaidItems) {
    await plaidClient.itemRemove({ access_token: item.accessToken });
  }
  await markPlaidItemsDisconnected(userId);

  // 2. Set data deletion countdown (90 days)
  await createDataDeletionSchedule(userId, {
    scheduledFor: addDays(Date.now(), 90)
  });

  // 3. Send email notification
  await sendEmail(userId, {
    template: 'subscription_ended',
    data: {
      dataExportUrl: `${DOMAIN}/dashboard/export`,
      resubscribeUrl: `${DOMAIN}/dashboard/settings/billing`,
      daysUntilDeletion: 90
    }
  });
}
```

**Data Retention Timeline**:
```
Day 0 (subscription ends):
  Email: "Your subscription ended. Export your data or resubscribe within 90 days."

Day 60:
  Email: "Reminder: Your data will be deleted in 30 days."

Day 80:
  Email: "Final warning: Your data will be deleted in 10 days."

Day 90:
  Action: Permanently delete all user data
  Email: "Your Koffers account has been permanently deleted."
```

**UI Indicators**:
- 🔴 Red banner: "Your subscription has ended. Resubscribe to restore access."
- All dashboard widgets show: "Subscribe to see your data"
- Sidebar menu items disabled (grayed out)
- Export button prominently displayed: "Export Your Data"
- Countdown timer: "Your data will be deleted in 45 days"

**Resubscribe Flow**:
- User clicks "Resubscribe" → redirected to Billing page
- Stripe Checkout flow
- On payment success → webhook fires → status = `active`
- Banks must be reconnected (Plaid Items were removed for security)

**Goal**: Let them clean up and export data, but clearly incentivize resubscription.

---

## 🚨 Critical: Plaid Auto-Disconnect

### Why This is MANDATORY

**Compliance (Data Minimization)**:
- GDPR Article 5(1)(c): "Personal data shall be adequate, relevant and limited to what is necessary"
- CCPA: Users have right to deletion
- Storing financial access tokens for non-paying users = legal risk

**Cost**:
- Plaid charges ~$0.10/month per active Item
- 1000 expired users with 2 banks each = $200/month wasted
- Could scale to thousands/month if not handled

**Security**:
- Expired users' bank access = attack vector
- If account compromised, attacker has bank access
- Remove access ASAP when subscription ends

### Implementation

```typescript
// app/api/webhooks/stripe/route.ts
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  // 1. Get all Plaid items for this user
  const { databases } = await createAdminClient();
  const plaidItems = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PLAID_ITEMS,
    [Query.equal('userId', userId)]
  );

  // 2. Remove each item from Plaid
  for (const item of plaidItems.documents) {
    try {
      await plaidClient.itemRemove({
        access_token: item.accessToken
      });

      // 3. Mark as disconnected in database
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PLAID_ITEMS,
        item.$id,
        {
          disconnectedAt: new Date().toISOString(),
          disconnectReason: 'subscription_ended'
        }
      );
    } catch (error) {
      console.error(`Failed to remove Plaid item ${item.$id}:`, error);
      // Log but continue (don't fail entire webhook)
    }
  }

  // 4. Update user subscription status
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subscription.id,
    {
      status: 'canceled',
      plaidDisconnectedAt: new Date().toISOString()
    }
  );

  // 5. Schedule data deletion
  await scheduleDataDeletion(userId, 90); // 90 days

  // 6. Send notification email
  await sendSubscriptionEndedEmail(userId);
}
```

**⚠️ Important Notes**:
- Once Plaid Item is removed, it CANNOT be restored
- User must re-authenticate via Plaid Link when they resubscribe
- This is actually a security best practice (fresh consent)
- Keep transaction history but mark `plaidItemId` as disconnected

---

## 🔄 Stripe Webhook Events to Handle

```typescript
// app/api/webhooks/stripe/route.ts

const webhookHandlers = {
  // User subscribes for first time
  'customer.subscription.created': async (subscription) => {
    await createSubscriptionRecord(subscription);
    await setUserLimits(subscription);
  },

  // Monthly renewal succeeds
  'customer.subscription.updated': async (subscription) => {
    await updateSubscriptionRecord(subscription);
    await resetMonthlyUsage(subscription.metadata.userId); // Reset chat count
  },

  // Payment fails (first time)
  'invoice.payment_failed': async (invoice) => {
    // Stripe automatically sets status to 'past_due'
    // Just send email notification
    await sendPaymentFailedEmail(invoice.customer, {
      nextRetryDate: invoice.next_payment_attempt
    });
  },

  // User manually cancels (but period continues)
  'customer.subscription.updated': async (subscription) => {
    if (subscription.cancel_at_period_end) {
      // Show banner but keep access
      await updateSubscriptionRecord(subscription);
      await sendCancellationConfirmationEmail(subscription.metadata.userId, {
        accessUntil: subscription.current_period_end
      });
    }
  },

  // Subscription actually ends (period expired OR all retries failed)
  'customer.subscription.deleted': async (subscription) => {
    await handleSubscriptionExpired(subscription.metadata.userId);
    // This triggers Plaid disconnect + data deletion schedule
  },

  // User adds an add-on
  'customer.subscription.updated': async (subscription) => {
    await updateUserLimits(subscription);
  }
};
```

---

## 📋 Database Schema

### `subscriptions` Collection

```typescript
interface Subscription {
  // Stripe IDs
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  stripePriceId: string; // Base plan price ID

  // Status
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'unpaid';
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string; // ISO date
  currentPeriodEnd: string;   // ISO date

  // Base Plan Limits
  basePlan: {
    name: 'starter' | 'professional' | 'business';
    banks: number;
    chatsPerMonth: number;
    storageGB: number;
  };

  // Add-ons
  addons: {
    extraBanks: number;
    extraChats: number;
    extraStorageGB: number;
  };

  // Calculated Totals
  maxBanks: number;
  maxChatsPerMonth: number;
  maxStorageGB: number;

  // Current Usage (tracked in real-time)
  currentUsage: {
    banksConnected: number;
    chatsUsedThisMonth: number;
    storageUsedGB: number;
    lastChatResetAt: string; // ISO date (billing cycle start)
  };

  // Plaid Management
  plaidDisconnectedAt: string | null;
  plaidDisconnectReason: 'subscription_ended' | 'user_request' | null;

  // Data Deletion
  dataDeletionScheduledFor: string | null; // ISO date (90 days after expiry)

  // Metadata
  userId: string;
  $createdAt: string;
  $updatedAt: string;
}
```

**Indexes**:
- `userId` (unique)
- `stripeSubscriptionId` (unique)
- `status` + `currentPeriodEnd` (for expired cleanup jobs)
- `dataDeletionScheduledFor` (for deletion job)

---

## 🎨 UI Components Needed

### 1. Subscription Status Banner

```tsx
// components/subscription-banner.tsx
export function SubscriptionBanner({ subscription }: { subscription: Subscription }) {
  // Past Due - Payment Failed
  if (subscription.status === 'past_due') {
    return (
      <Banner variant="warning">
        <AlertTriangle className="h-5 w-5" />
        <div>
          <strong>Payment Failed</strong> - We'll retry automatically, or
          <Link href="/dashboard/settings/billing">update your payment method now</Link>.
        </div>
      </Banner>
    );
  }

  // Canceled but still active
  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd > Date.now()) {
    const daysLeft = Math.ceil((subscription.currentPeriodEnd - Date.now()) / (1000 * 60 * 60 * 24));
    return (
      <Banner variant="info">
        <Info className="h-5 w-5" />
        <div>
          Your subscription will end in {daysLeft} days.
          <Link href="/dashboard/settings/billing">Reactivate to continue access</Link>.
        </div>
      </Banner>
    );
  }

  // Expired - Locked Out
  if (subscription.status === 'canceled' && subscription.currentPeriodEnd < Date.now()) {
    const daysUntilDeletion = Math.ceil(
      (subscription.dataDeletionScheduledFor - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return (
      <Banner variant="error">
        <XCircle className="h-5 w-5" />
        <div>
          <strong>Subscription Ended</strong> -
          <Link href="/dashboard/export">Export your data</Link> or
          <Link href="/dashboard/settings/billing">resubscribe</Link>
          within {daysUntilDeletion} days.
        </div>
      </Banner>
    );
  }

  return null; // No banner for active users
}
```

### 2. Usage Meter Widget

```tsx
// components/usage-meter.tsx
export function UsageMeter({ subscription }: { subscription: Subscription }) {
  const usage = subscription.currentUsage;
  const limits = {
    banks: subscription.maxBanks,
    chats: subscription.maxChatsPerMonth,
    storage: subscription.maxStorageGB
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage This Month</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Banks */}
        <div>
          <div className="flex justify-between mb-2">
            <span>Bank Connections</span>
            <span>{usage.banksConnected}/{limits.banks}</span>
          </div>
          <Progress value={(usage.banksConnected / limits.banks) * 100} />
          {usage.banksConnected >= limits.banks && (
            <Button variant="link" href="/dashboard/settings/billing?addon=banks">
              Add more banks ($5/mo each)
            </Button>
          )}
        </div>

        {/* Chats */}
        <div>
          <div className="flex justify-between mb-2">
            <span>LLM Messages</span>
            <span>{usage.chatsUsedThisMonth.toLocaleString()}/{limits.chats.toLocaleString()}</span>
          </div>
          <Progress value={(usage.chatsUsedThisMonth / limits.chats) * 100} />
          {usage.chatsUsedThisMonth >= limits.chats * 0.8 && (
            <p className="text-sm text-muted-foreground">
              {limits.chats - usage.chatsUsedThisMonth} messages remaining
            </p>
          )}
        </div>

        {/* Storage */}
        <div>
          <div className="flex justify-between mb-2">
            <span>Receipt Storage</span>
            <span>{usage.storageUsedGB.toFixed(2)}/{limits.storage} GB</span>
          </div>
          <Progress value={(usage.storageUsedGB / limits.storage) * 100} />
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Demo Mode Indicator

```tsx
// components/demo-mode-banner.tsx
export function DemoModeBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 px-4 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <span className="font-medium">You're viewing demo data</span>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/dashboard/settings/billing">
            Subscribe to connect your real accounts →
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

---

## 🔐 Access Control Helper

```typescript
// lib/subscription-check.ts
import { getCurrentUser } from '@/lib/appwrite-server';
import { unstable_cache } from 'next/cache';

export interface AccessCheck {
  hasAccess: boolean;
  subscription: Subscription | null;
  isDemoMode: boolean;
  reason?: 'no_subscription' | 'expired' | 'limit_reached' | 'past_due';
  limitType?: 'banks' | 'chats' | 'storage';
}

/**
 * Check if user has access to a feature
 * Cached for 60 seconds to reduce DB queries
 */
export const checkSubscriptionAccess = unstable_cache(
  async (feature?: 'banks' | 'chats' | 'storage'): Promise<AccessCheck> => {
    const user = await getCurrentUser();

    if (!user) {
      return { hasAccess: false, subscription: null, isDemoMode: false, reason: 'no_subscription' };
    }

    // Get subscription from database
    const { databases } = await createAdminClient();
    const subscriptions = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      [Query.equal('userId', user.$id), Query.limit(1)]
    );

    // No subscription = demo mode
    if (subscriptions.documents.length === 0) {
      return {
        hasAccess: false,
        subscription: null,
        isDemoMode: true,
        reason: 'no_subscription'
      };
    }

    const subscription = subscriptions.documents[0] as Subscription;

    // Check if subscription is active
    const isActive = subscription.status === 'active' ||
                     subscription.status === 'trialing' ||
                     (subscription.status === 'past_due'); // Grace period

    // Check if period has ended
    const periodEnded = new Date(subscription.currentPeriodEnd) < new Date();

    if (!isActive || periodEnded) {
      return {
        hasAccess: false,
        subscription,
        isDemoMode: false,
        reason: 'expired'
      };
    }

    // Check feature-specific limits
    if (feature === 'banks') {
      if (subscription.currentUsage.banksConnected >= subscription.maxBanks) {
        return {
          hasAccess: false,
          subscription,
          isDemoMode: false,
          reason: 'limit_reached',
          limitType: 'banks'
        };
      }
    }

    if (feature === 'chats') {
      if (subscription.currentUsage.chatsUsedThisMonth >= subscription.maxChatsPerMonth) {
        return {
          hasAccess: false,
          subscription,
          isDemoMode: false,
          reason: 'limit_reached',
          limitType: 'chats'
        };
      }
    }

    if (feature === 'storage') {
      if (subscription.currentUsage.storageUsedGB >= subscription.maxStorageGB) {
        return {
          hasAccess: false,
          subscription,
          isDemoMode: false,
          reason: 'limit_reached',
          limitType: 'storage'
        };
      }
    }

    return { hasAccess: true, subscription, isDemoMode: false };
  },
  ['subscription-check'],
  { revalidate: 60, tags: ['subscription'] }
);

/**
 * Invalidate subscription cache (call from webhooks)
 */
export function invalidateSubscriptionCache() {
  revalidateTag('subscription');
}
```

---

## 📝 Implementation Phases

### Phase 1: Foundation (3-4 hours)
- [ ] Create `subscriptions` collection in Appwrite
- [ ] Create `lib/subscription-check.ts` helper
- [ ] Add Stripe webhook handler for subscription events
- [ ] Implement Plaid auto-disconnect logic
- [ ] Test with Stripe test mode

### Phase 2: UI Components (2-3 hours)
- [ ] Create SubscriptionBanner component
- [ ] Create UsageMeter component
- [ ] Create DemoModeBanner component
- [ ] Add upgrade modals/dialogs

### Phase 3: Page Guards (2-3 hours)
- [ ] Add guards to `/dashboard/transactions`
- [ ] Add guards to `/dashboard/files`
- [ ] Add guards to `/dashboard/chat`
- [ ] Add guards to Plaid connect flow
- [ ] Test all access scenarios

### Phase 4: Demo Data (2-3 hours)
- [ ] Create demo bank accounts seeder
- [ ] Create demo transactions seeder
- [ ] Create demo receipts seeder
- [ ] Implement demo data queries (separate from real data)

### Phase 5: Data Management (2-3 hours)
- [ ] Create data deletion schedule system
- [ ] Create email notification templates
- [ ] Implement export functionality
- [ ] Test deletion workflow

**Total Estimated Time: 11-16 hours**

---

## 🧪 Testing Checklist

### Demo Mode
- [ ] New user sees demo data in all widgets
- [ ] Dashboards populate with demo charts
- [ ] LLM can query demo data (30 messages max)
- [ ] "Connect Bank" button shows upgrade prompt
- [ ] Upload receipt shows upgrade prompt

### Active Subscription
- [ ] Can connect up to limit banks
- [ ] Hitting bank limit shows upgrade modal
- [ ] Can use LLM up to chat limit
- [ ] Usage meters update in real-time
- [ ] Add-ons increase limits correctly

### Past Due
- [ ] Full access continues during retry window
- [ ] Payment failed banner shows
- [ ] Can update payment method
- [ ] Updating card auto-retries invoice

### Expired
- [ ] Can view (but not edit) data
- [ ] Can export data
- [ ] Cannot connect new banks
- [ ] Cannot refresh Plaid data
- [ ] Plaid items automatically disconnected
- [ ] Data deletion countdown shows

### Stripe Webhooks
- [ ] `subscription.created` → creates subscription record
- [ ] `subscription.updated` → updates limits
- [ ] `subscription.deleted` → disconnects Plaid
- [ ] `invoice.payment_failed` → sends email
- [ ] All webhooks handled without errors

---

## 🔗 Related Documentation

- `APPWRITE_OFFICIAL_RECOMMENDATION.md` - Why we use Server Components
- `NEXTJS_APPWRITE_STRIPE_PATTERNS.md` - Stack integration patterns
- `FIX_APPWRITE_PERMISSIONS.md` - Database security setup

---

## 📚 External References

- [Stripe Subscription Lifecycle](https://docs.stripe.com/billing/subscriptions/overview)
- [Stripe Smart Retries](https://stripe.com/docs/billing/automatic-collection)
- [Plaid Item Remove API](https://plaid.com/docs/api/items/#itemremove)
- [GDPR Data Minimization](https://gdpr-info.eu/art-5-gdpr/)
