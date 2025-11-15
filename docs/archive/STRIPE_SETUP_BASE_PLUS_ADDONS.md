# Stripe Setup Guide: Base + Add-Ons Model

**Pricing Strategy:** Base subscription ($21/year) + optional add-ons users can stack as needed
**Goal:** Train users that Koffers = low base price + pay for what you actually use

---

## Final Pricing Structure

### Base Subscription: $21/year
**Includes:**
- 3 bank institutions (all accounts per institution included)
- 100 AI chats per month
- 5GB storage
- All core features

### Add-Ons (Optional)
- **+3 Bank Connections:** $10/year
- **+100 AI Chats/Month:** $8/year
- **+10GB Storage:** $5/year

**Example user cost:**
- Light user (base only): $21/year
- Power user (base + 2 add-ons): $21 + $10 + $8 = $39/year
- Still 4-5x cheaper than competitors at $180/year

---

## How Stripe Handles Base + Add-Ons

Stripe calls this model **"Subscription with Multiple Products"** or **"Composite Subscriptions"**.

### How It Works:
1. Customer subscribes to **Base** ($21/year)
2. Customer can add **multiple add-on products** to the same subscription
3. All products share the same billing cycle (annual)
4. Stripe handles proration automatically when add-ons are added mid-cycle
5. At renewal, all products renew together

### Key Stripe Concepts:

**Product:** The thing you're selling (e.g., "Koffers Base", "+3 Banks")
**Price:** The cost and billing interval (e.g., "$21/year")
**Subscription:** A customer's active payment plan
**Subscription Item:** Each product attached to a subscription (base + each add-on)

---

## Step 1: Create Stripe Account

1. Go to https://stripe.com
2. Sign up with your email
3. Company name: **Koffers**
4. Complete identity verification
5. Add bank account for payouts
6. Activate account (both test and live mode)

---

## Step 2: Create Products in Stripe Dashboard

Go to: **Dashboard → Products → Add Product**

### Product 1: Koffers Base (REQUIRED)
- **Name:** Koffers Base Subscription
- **Description:** 3 bank institutions, 100 AI chats/month, 5GB storage, all core features
- **Pricing Model:** Standard pricing
- **Price:** $21.00
- **Billing period:** Yearly
- **Currency:** USD

**After creating, copy the Price ID:** `price_xxxxxxxxxxxxx`

---

### Product 2: +3 Bank Connections (ADD-ON)
- **Name:** +3 Bank Connections
- **Description:** Add 3 more bank institutions to your account
- **Pricing Model:** Standard pricing
- **Price:** $10.00
- **Billing period:** Yearly
- **Currency:** USD

**Copy the Price ID:** `price_xxxxxxxxxxxxx`

---

### Product 3: +100 AI Chats/Month (ADD-ON)
- **Name:** +100 AI Chats per Month
- **Description:** Increase your monthly AI chat limit by 100
- **Pricing Model:** Standard pricing
- **Price:** $8.00
- **Billing period:** Yearly
- **Currency:** USD

**Copy the Price ID:** `price_xxxxxxxxxxxxx`

---

### Product 4: +10GB Storage (ADD-ON)
- **Name:** +10GB Storage
- **Description:** Add 10GB of storage for receipts and documents
- **Pricing Model:** Standard pricing
- **Price:** $5.00
- **Billing period:** Yearly
- **Currency:** USD

**Copy the Price ID:** `price_xxxxxxxxxxxxx`

---

## Step 3: How to Add Multiple Products to One Subscription

Stripe supports this natively. Here's how it works:

### When User First Subscribes (Base Only):

```javascript
// Create checkout session with just base subscription
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [
    {
      price: 'price_BASE_SUBSCRIPTION_ID',
      quantity: 1,
    },
  ],
  success_url: 'https://koffers.ai/pricing/success',
  cancel_url: 'https://koffers.ai/pricing/cancel',
});
```

### When User Adds an Add-On Later:

```javascript
// Get their existing subscription
const subscription = await stripe.subscriptions.retrieve(subscriptionId);

// Add the new add-on to the subscription
await stripe.subscriptions.update(subscriptionId, {
  items: [
    ...subscription.items.data, // Keep existing items
    {
      price: 'price_ADDON_ID', // Add new add-on
      quantity: 1,
    },
  ],
  proration_behavior: 'create_prorations', // Stripe auto-prorates
});
```

**Stripe automatically:**
- Calculates prorated charge for remaining time
- Charges the customer immediately
- Adds add-on to their subscription
- Renews everything together at next billing cycle

---

## Step 4: Set Up Webhooks

Go to: **Dashboard → Developers → Webhooks → Add endpoint**

**Endpoint URL:** `https://koffers.ai/api/stripe/webhook`

**Events to listen for:**
- `checkout.session.completed` - User completed initial subscription
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Add-on added or removed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Renewal payment succeeded
- `invoice.payment_failed` - Payment failed

**After creating, copy the webhook secret:** `whsec_xxxxxxxxxxxxx`

---

## Step 5: Get API Keys

Go to: **Dashboard → Developers → API Keys**

### Test Mode (for development):
- **Publishable key:** `pk_test_xxxxxxxxxxxxx`
- **Secret key:** `sk_test_xxxxxxxxxxxxx`

### Live Mode (for production):
- **Publishable key:** `pk_live_xxxxxxxxxxxxx`
- **Secret key:** `sk_live_xxxxxxxxxxxxx`

---

## Step 6: Environment Variables

Add these to Vercel:

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price IDs
STRIPE_PRICE_BASE=price_xxxxxxxxxxxxx
STRIPE_PRICE_ADDON_BANKS=price_xxxxxxxxxxxxx
STRIPE_PRICE_ADDON_CHATS=price_xxxxxxxxxxxxx
STRIPE_PRICE_ADDON_STORAGE=price_xxxxxxxxxxxxx
```

---

## Step 7: Database Schema for Add-Ons

### Appwrite Collection: `subscriptions`

**Attributes:**
- `userId` (string, required)
- `stripeCustomerId` (string, required)
- `stripeSubscriptionId` (string, required)
- `status` (string, required) - active, canceled, past_due
- `currentPeriodEnd` (datetime, required)
- `basePlan` (boolean, required) - always true
- `addonBanks` (integer, required) - number of bank add-ons (0, 1, 2, 3...)
- `addonChats` (integer, required) - number of chat add-ons (0, 1, 2, 3...)
- `addonStorage` (integer, required) - number of storage add-ons (0, 1, 2, 3...)
- `maxBanks` (integer, required) - calculated: 3 + (addonBanks × 3)
- `maxChatsPerMonth` (integer, required) - calculated: 100 + (addonChats × 100)
- `maxStorageGB` (integer, required) - calculated: 5 + (addonStorage × 10)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)

**Example:**
- User has base + 1 bank add-on + 2 chat add-ons
- `addonBanks: 1` → `maxBanks: 6`
- `addonChats: 2` → `maxChatsPerMonth: 300`
- `addonStorage: 0` → `maxStorageGB: 5`

---

## Step 8: User Flow Examples

### Scenario 1: New User Signs Up

1. User clicks "Get Started" on pricing page
2. Redirected to Stripe Checkout for $21/year base
3. Completes payment
4. Webhook fires: `checkout.session.completed`
5. Your app creates subscription record:
   - `basePlan: true`
   - `addonBanks: 0`, `addonChats: 0`, `addonStorage: 0`
   - `maxBanks: 3`, `maxChatsPerMonth: 100`, `maxStorageGB: 5`

### Scenario 2: User Adds 4th Bank (Mid-Cycle)

1. User tries to connect 4th bank
2. Your app shows: "You're at your 3 bank limit. Add +3 banks for $10/year?"
3. User clicks "Add +3 Banks"
4. Your app calls Stripe API to add add-on to subscription
5. Stripe charges prorated amount (e.g., $5 for 6 months remaining)
6. Webhook fires: `customer.subscription.updated`
7. Your app updates subscription record:
   - `addonBanks: 1`
   - `maxBanks: 6`

### Scenario 3: User Hits 100 Chat Limit

1. User sends 101st chat this month
2. Your app blocks the chat, shows: "You've used 100 chats. Add +100/month for $8/year?"
3. User clicks "Add More Chats"
4. Stripe charges prorated amount
5. Webhook updates subscription
6. Your app updates:
   - `addonChats: 1`
   - `maxChatsPerMonth: 200`

### Scenario 4: Annual Renewal

1. 365 days later, Stripe auto-charges renewal
2. If user has base + 1 bank add-on + 1 chat add-on:
   - Charges: $21 + $10 + $8 = **$39 total**
3. Webhook fires: `invoice.payment_succeeded`
4. Your app updates `currentPeriodEnd` to +1 year

---

## Step 9: How Proration Works

Stripe handles this automatically with `proration_behavior: 'create_prorations'`

### Example Calculation:

**User scenario:**
- Subscribed Jan 1 for $21/year base
- Adds +3 banks add-on on July 1 (6 months in)

**Stripe's math:**
- Annual cost of add-on: $10
- Remaining time: 6 months / 12 months = 0.5
- Prorated charge: $10 × 0.5 = **$5.00**

**Next renewal (Jan 1 next year):**
- Base: $21
- +3 Banks: $10
- **Total: $31**

---

## Step 10: Testing Checklist

Use Stripe test mode first:

### Test Cards:
- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- Expiry: any future date (e.g., 12/34)
- CVC: any 3 digits

### Test Scenarios:
- [ ] Subscribe to base ($21/year)
- [ ] Webhook creates subscription record
- [ ] User dashboard shows "3 banks, 100 chats/month"
- [ ] Add +3 banks add-on mid-cycle
- [ ] Stripe charges prorated amount
- [ ] Webhook updates subscription
- [ ] User dashboard shows "6 banks"
- [ ] Add +100 chats add-on
- [ ] Stripe charges prorated amount
- [ ] User can now send 200 chats/month
- [ ] Cancel subscription
- [ ] Webhook fires, Plaid items removed
- [ ] Test annual renewal
- [ ] Stripe charges full year for all items

---

## Step 11: Allowing Users to Remove Add-Ons

Users can remove add-ons, but they stay active until renewal (no refunds):

```javascript
// Remove an add-on from subscription
await stripe.subscriptionItems.del(subscriptionItemId);
```

**How it works:**
- User has base + bank add-on ($31/year)
- User removes bank add-on on July 1
- Add-on stays active until next renewal (Jan 1)
- At renewal: Only charges $21 base (add-on not renewed)

**Best practice:**
- Allow removal anytime
- Make it clear: "This will not renew at your next billing date"
- No refunds for removing mid-cycle

---

## Step 12: Customer Portal

Stripe has a built-in customer portal for managing subscriptions.

### Enable Customer Portal:
1. Go to **Dashboard → Settings → Customer Portal**
2. Turn on "Customers can update their subscriptions"
3. Configure what customers can do:
   - ✅ Update payment method
   - ✅ Cancel subscription
   - ✅ View invoice history
   - ❌ Pause subscription (turn off)

### Generate Portal Link:

```javascript
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'https://koffers.ai/dashboard/settings',
});

// Redirect user to session.url
```

**What users can do in portal:**
- Update credit card
- View invoices
- Cancel subscription
- See renewal date

**What they CAN'T do:**
- Add add-ons (you control this in your app)
- Change pricing

---

## Step 13: Displaying Current Plan to Users

In your dashboard, show users what they have:

```
YOUR SUBSCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Koffers Base                    $21/year
+ 3 Bank Connections Add-On     $10/year
+ 100 AI Chats Add-On            $8/year
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:                          $39/year

Your current limits:
• 6 bank institutions (3 base + 3 add-on)
• 200 AI chats/month (100 base + 100 add-on)
• 5GB storage

Next renewal: January 1, 2026

[Add More Banks] [Add More Chats] [Add Storage]
[Manage Payment Method] [View Invoices]
```

---

## Step 14: Add-On Upsell Triggers

### When to prompt users to add add-ons:

**Bank Limit:**
- User has 3 banks connected, tries to add 4th
- Show modal: "You're at your limit. Add +3 banks for $10/year?"

**Chat Limit:**
- User sends 100th chat in a month
- Show banner: "You've used 100 chats this month. Add +100/month for $8/year?"
- Block 101st chat until they upgrade

**Storage Limit:**
- User has 4.5GB used, uploads large file
- Show warning: "You're at 90% storage. Add +10GB for $5/year?"

**AI can also suggest:**
```
AI: "I notice you're using a lot of chats this month (85/100).
Would you like to add +100 chats/month for $8/year so you
don't hit the limit?"

[Yes, Add It] [No Thanks]
```

---

## Step 15: Pricing Page Copy

```html
PRICING - PAY FOR WHAT YOU ACTUALLY USE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BASE SUBSCRIPTION - $21/YEAR
Get started with everything you need:

✓ 3 Bank Institutions
  (This means 3 banks like Chase, Bank of America, etc.
   ALL accounts within each bank are included - checking,
   savings, credit cards, loans - everything under one login)

✓ 100 AI Financial Assistant Chats/Month
  (Plenty for normal use - ask questions, get insights)

✓ 5GB Receipt & Document Storage
  (Store thousands of receipts)

✓ All Core Features
  (Budget tracking, spending analysis, receipt scanning,
   transaction search, financial insights)

[Get Started for $21/Year]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEED MORE? ADD WHAT YOU USE

Most people are good with the base plan. But if you need more,
just add it on. Only pay for what you actually need.

+3 More Bank Institutions          $10/year
  (Add 3 more banks - need 9 total? Add this twice)

+100 More AI Chats/Month           $8/year
  (Heavy AI user? Stack these as needed)

+10GB Storage                      $5/year
  (For receipt hoarders and document collectors)

You can add these anytime. We'll prorate the cost based on
when you add them during your subscription year.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXAMPLE PRICING

Light user (most people):
  Base only = $21/year

Power user:
  Base + 1 bank add-on + 1 chat add-on = $39/year

Business user:
  Base + 2 bank add-ons + 2 chat add-ons = $57/year

Still 3-7x cheaper than competitors at $180/year

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHY NO FREE TRIAL?

At $21/year ($1.75/month), the price IS the trial.
That's less than a cup of coffee per month.

Other apps charge $15/month. We charge $21/year.
The risk is minimal, the value is massive.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMPARE TO COMPETITORS

YNAB:     $180/year   (8.5x more expensive)
Copilot:  $168/year   (8x more expensive)
Monarch:  $180/year   (8.5x more expensive)
Koffers:  $21/year    ← You're here
```

---

## Step 16: Code Implementation Summary

### What needs to be built:

1. **Pricing page** (`/app/pricing/page.tsx`)
   - Shows base subscription
   - Shows available add-ons
   - "Get Started" button

2. **Checkout API** (`/app/api/stripe/checkout/route.ts`)
   - Creates Stripe Checkout session for base subscription
   - Returns checkout URL

3. **Add-On Purchase API** (`/app/api/stripe/add-addon/route.ts`)
   - Takes `addonType` (banks, chats, storage)
   - Adds add-on to existing subscription
   - Stripe handles proration

4. **Webhook Handler** (`/app/api/stripe/webhook/route.ts`)
   - Handles subscription events
   - Updates Appwrite subscription records
   - Removes Plaid items on cancellation

5. **Dashboard** (`/app/dashboard/subscription/page.tsx`)
   - Shows current plan and add-ons
   - Shows usage (3/6 banks, 45/100 chats this month)
   - Buttons to add more

6. **Usage Tracking Middleware**
   - Checks limits before actions (connect bank, send chat)
   - Shows upgrade prompt when limit reached

---

## Step 17: Key Stripe API Calls

### Create Subscription (Checkout):
```javascript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: STRIPE_PRICE_BASE, quantity: 1 }],
  success_url: 'https://koffers.ai/pricing/success',
  cancel_url: 'https://koffers.ai/pricing/cancel',
});
```

### Add Add-On to Existing Subscription:
```javascript
await stripe.subscriptions.update(subscriptionId, {
  items: [
    { price: STRIPE_PRICE_ADDON_BANKS, quantity: 1 },
  ],
  proration_behavior: 'create_prorations',
});
```

### List All Subscription Items:
```javascript
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
// subscription.items.data contains all products
```

### Remove Add-On:
```javascript
await stripe.subscriptionItems.del(subscriptionItemId);
```

### Create Customer Portal Link:
```javascript
const session = await stripe.billingPortal.sessions.create({
  customer: customerId,
  return_url: 'https://koffers.ai/dashboard',
});
```

---

## Step 18: Go Live Checklist

- [ ] All products created in Stripe
- [ ] Price IDs saved to environment variables
- [ ] Webhooks configured and tested
- [ ] Test mode: all scenarios pass
- [ ] Checkout flow works
- [ ] Add-ons can be added mid-cycle
- [ ] Proration calculates correctly
- [ ] Subscription records sync to Appwrite
- [ ] Usage limits enforced
- [ ] Upgrade prompts appear at right time
- [ ] Customer portal works
- [ ] Switch to live API keys
- [ ] Test one real transaction in live mode
- [ ] Monitor webhooks for 24 hours

---

## Resources

- **Stripe Subscriptions Docs:** https://stripe.com/docs/billing/subscriptions/overview
- **Multiple Products per Subscription:** https://stripe.com/docs/billing/subscriptions/multiple-products
- **Proration:** https://stripe.com/docs/billing/subscriptions/prorations
- **Webhooks:** https://stripe.com/docs/webhooks
- **Customer Portal:** https://stripe.com/docs/billing/subscriptions/integrating-customer-portal
- **Testing:** https://stripe.com/docs/testing

---

## Summary: What to Create in Stripe NOW

1. **Product: Koffers Base** → Price: $21/year → Copy price ID
2. **Product: +3 Banks Add-On** → Price: $10/year → Copy price ID
3. **Product: +100 Chats Add-On** → Price: $8/year → Copy price ID
4. **Product: +10GB Storage Add-On** → Price: $5/year → Copy price ID
5. **Webhook Endpoint** → URL: your-domain/api/stripe/webhook → Copy secret
6. **Get API Keys** → Test + Live keys

That's it. Then you're ready to build the integration.
