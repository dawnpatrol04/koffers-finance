# Stripe Implementation Guide for Koffers

**Goal:** Set up annual subscription billing for Koffers with 4 pricing tiers
**Timeline:** Must be done before launch (promotions go out in 3 days)

---

## Step 1: Create Stripe Account

### 1.1 Sign Up
1. Go to https://stripe.com
2. Click "Sign up"
3. Use business email: (your email)
4. Company name: **Koffers**
5. Complete identity verification

### 1.2 Activate Account
1. Complete business details
2. Add bank account for payouts
3. Verify business information
4. Enable live mode (not just test mode)

### 1.3 Get API Keys
Location: Dashboard → Developers → API keys

**You need TWO sets:**

**Test Mode Keys:**
- Publishable key: `pk_test_...`
- Secret key: `sk_test_...`

**Live Mode Keys:**
- Publishable key: `pk_live_...`
- Secret key: `sk_live_...`

**Save these to Vercel environment variables:**
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=(we'll get this in Step 3)
```

---

## Step 2: Create Products in Stripe

Go to: Dashboard → Products → Add Product

### Product 1: Koffers Basic (3 Banks)
**Product Name:** Koffers - 3 Bank Connections
**Description:** Annual subscription with 3 bank connections, unlimited AI assistant, unlimited receipt scanning
**Pricing:**
- Price: **$21.00 USD**
- Billing period: **Yearly**
- Payment type: **Recurring**

**After creating, save the Price ID:** `price_xxxxxxxxxxxxx`

### Product 2: Koffers Plus (6 Banks)
**Product Name:** Koffers - 6 Bank Connections
**Description:** Annual subscription with 6 bank connections, unlimited AI assistant, unlimited receipt scanning
**Pricing:**
- Price: **$35.00 USD**
- Billing period: **Yearly**
- Payment type: **Recurring**

**Save the Price ID:** `price_xxxxxxxxxxxxx`

### Product 3: Koffers Pro (9 Banks)
**Product Name:** Koffers - 9 Bank Connections
**Description:** Annual subscription with 9 bank connections, unlimited AI assistant, unlimited receipt scanning
**Pricing:**
- Price: **$48.00 USD**
- Billing period: **Yearly**
- Payment type: **Recurring**

**Save the Price ID:** `price_xxxxxxxxxxxxx`

### Product 4: Koffers Premium (12 Banks)
**Product Name:** Koffers - 12 Bank Connections
**Description:** Annual subscription with 12 bank connections, unlimited AI assistant, unlimited receipt scanning
**Pricing:**
- Price: **$61.00 USD**
- Billing period: **Yearly**
- Payment type: **Recurring**

**Save the Price ID:** `price_xxxxxxxxxxxxx`

---

## Step 3: Set Up Webhooks

Webhooks tell your app when subscription events happen (payment succeeded, canceled, etc.)

### 3.1 Create Webhook Endpoint
Go to: Dashboard → Developers → Webhooks → Add endpoint

**Endpoint URL:** `https://koffers.ai/api/stripe/webhook`

**Events to listen for:**
- `checkout.session.completed` - Customer completed payment
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription modified (upgrade/downgrade)
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Annual renewal payment succeeded
- `invoice.payment_failed` - Payment failed (update payment method)

### 3.2 Get Webhook Signing Secret
After creating the webhook, Stripe shows: `whsec_xxxxxxxxxxxxx`

**Save to Vercel:**
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

## Step 4: Install Stripe SDK

```bash
npm install stripe @stripe/stripe-js
```

---

## Step 5: Code Implementation Overview

### What needs to be built:

#### 5.1 Pricing Page (`/app/pricing/page.tsx`)
- Show 4 tiers (3, 6, 9, 12 banks)
- "Subscribe" button for each tier
- Clicking button → redirects to Stripe Checkout

#### 5.2 Checkout API Route (`/app/api/stripe/checkout/route.ts`)
- Takes `priceId` from pricing page
- Creates Stripe Checkout Session
- Returns checkout URL
- User goes to Stripe's hosted checkout page

#### 5.3 Webhook Handler (`/app/api/stripe/webhook/route.ts`)
- Receives events from Stripe
- Validates webhook signature
- Handles subscription events:
  - `checkout.session.completed` → Create user subscription record in Appwrite
  - `customer.subscription.deleted` → Cancel subscription, call `plaid.itemRemove()`
  - `invoice.payment_failed` → Mark subscription as past due

#### 5.4 Success Page (`/app/pricing/success/page.tsx`)
- User lands here after successful payment
- Shows "Welcome to Koffers!"
- Button to connect banks

#### 5.5 Cancel Page (`/app/pricing/cancel/page.tsx`)
- User lands here if they cancel checkout
- Shows "No problem, come back anytime!"

#### 5.6 Customer Portal (`/app/api/stripe/portal/route.ts`)
- Generates link to Stripe Customer Portal
- Users can update payment method, cancel subscription
- Accessible from dashboard settings

---

## Step 6: Database Schema (Appwrite)

### Collection: `subscriptions`

**Attributes:**
- `userId` (string, required) - Links to user
- `stripeCustomerId` (string, required) - Stripe customer ID
- `stripeSubscriptionId` (string, required) - Stripe subscription ID
- `stripePriceId` (string, required) - Which tier they're on
- `status` (string, required) - active, canceled, past_due, trialing
- `currentPeriodEnd` (datetime, required) - When subscription renews
- `cancelAtPeriodEnd` (boolean, required) - True if user canceled
- `maxBanks` (integer, required) - 3, 6, 9, or 12
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)

**Indexes:**
- `userId` (unique)
- `stripeCustomerId`
- `stripeSubscriptionId`
- `status`

---

## Step 7: Environment Variables Checklist

Add these to Vercel (Production & Preview):

```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price IDs
STRIPE_PRICE_3_BANKS=price_xxxxxxxxxxxxx
STRIPE_PRICE_6_BANKS=price_xxxxxxxxxxxxx
STRIPE_PRICE_9_BANKS=price_xxxxxxxxxxxxx
STRIPE_PRICE_12_BANKS=price_xxxxxxxxxxxxx

# Existing
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=xxxxxxxxxxxxx
APPWRITE_API_KEY=xxxxxxxxxxxxx
PLAID_CLIENT_ID=xxxxxxxxxxxxx
PLAID_SECRET=xxxxxxxxxxxxx
PLAID_ENV=production
ANTHROPIC_API_KEY=xxxxxxxxxxxxx
```

---

## Step 8: Testing Checklist

### Test Mode (before going live):

1. **Use test API keys** (`pk_test_...`, `sk_test_...`)
2. **Test card numbers:**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date (e.g., 12/34)
   - Any 3-digit CVC

3. **Test scenarios:**
   - [ ] User selects 3-bank tier → checkout → payment succeeds
   - [ ] User selects 6-bank tier → checkout → payment succeeds
   - [ ] Webhook fires `checkout.session.completed`
   - [ ] Subscription record created in Appwrite
   - [ ] User can see "Active Subscription" in dashboard
   - [ ] User cancels subscription → webhook fires
   - [ ] Plaid items removed on cancellation
   - [ ] User upgrades from 3 banks to 6 banks
   - [ ] Payment fails → user sees error message

---

## Step 9: Go Live Checklist

Before switching to live mode:

- [ ] All test scenarios pass
- [ ] Webhook endpoint is live and responding
- [ ] Environment variables updated with live keys
- [ ] Stripe account fully verified
- [ ] Bank account added for payouts
- [ ] Customer portal configured
- [ ] Refund policy added to pricing page
- [ ] Terms of Service link added
- [ ] Privacy Policy link added

---

## Step 10: Post-Launch Monitoring

### Week 1:
- [ ] Check Stripe dashboard daily
- [ ] Monitor webhook delivery (Dashboard → Developers → Webhooks → Logs)
- [ ] Verify subscriptions are being created in Appwrite
- [ ] Check for failed payments
- [ ] Monitor Plaid cleanup (no zombie connections)

### Ongoing:
- [ ] Weekly: Audit Plaid items vs active subscriptions
- [ ] Monthly: Review Stripe fees vs projections
- [ ] Monthly: Check churn rate (cancellations / total subscribers)
- [ ] Quarterly: Review pricing strategy

---

## Stripe Dashboard Quick Links

**Test Mode:**
- Customers: https://dashboard.stripe.com/test/customers
- Subscriptions: https://dashboard.stripe.com/test/subscriptions
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Logs: https://dashboard.stripe.com/test/logs

**Live Mode:**
- Customers: https://dashboard.stripe.com/customers
- Subscriptions: https://dashboard.stripe.com/subscriptions
- Webhooks: https://dashboard.stripe.com/webhooks
- Revenue: https://dashboard.stripe.com/dashboard

---

## Common Issues & Solutions

### Issue: Webhook not receiving events
**Solution:** Check webhook URL is correct, endpoint is live, returns 200 status

### Issue: Signature verification failing
**Solution:** Make sure you're using raw request body, not parsed JSON

### Issue: User charged but subscription not created
**Solution:** Check webhook logs, may need to manually create subscription

### Issue: User cancels but Plaid charges continue
**Solution:** Implement automatic `plaid.itemRemove()` on cancellation webhook

### Issue: User wants refund
**Solution:** Stripe Dashboard → find payment → click "Refund"

---

## Next Steps

1. **Create Stripe account** (today)
2. **Set up products** (today)
3. **Get API keys** (today)
4. **Build checkout flow** (1-2 days)
5. **Build webhook handler** (1 day)
6. **Test everything** (1 day)
7. **Go live** (before promotions launch)

---

## Support & Resources

- Stripe Docs: https://stripe.com/docs
- Stripe API Reference: https://stripe.com/docs/api
- Next.js + Stripe Guide: https://stripe.com/docs/payments/checkout/nextjs
- Webhooks Guide: https://stripe.com/docs/webhooks
- Testing: https://stripe.com/docs/testing

---

## Critical Reminders

🚨 **Never commit API keys to git**
🚨 **Always verify webhook signatures**
🚨 **Always use HTTPS in production**
🚨 **Test in test mode first**
🚨 **Remove Plaid items on cancellation**
🚨 **Monitor webhook delivery**
🚨 **Handle failed payments gracefully**

---

## Stripe Price IDs Reference

Once you create the products, update this table:

| Tier | Banks | Annual Price | Stripe Price ID |
|------|-------|--------------|-----------------|
| Basic | 3 | $21 | `price_____________` |
| Plus | 6 | $35 | `price_____________` |
| Pro | 9 | $48 | `price_____________` |
| Premium | 12 | $61 | `price_____________` |

**Save these to `.env.local` for easy reference during development.**
