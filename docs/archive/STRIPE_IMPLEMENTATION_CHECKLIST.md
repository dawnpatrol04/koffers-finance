# Stripe Implementation Checklist

Complete implementation checklist for launching Stripe billing on Koffers.

## Phase 1: Stripe Account Setup ⏳

### 1.1 Create Stripe Account
- [ ] Go to [stripe.com](https://stripe.com) and create account
- [ ] Create "Koffers" organization
- [ ] Complete business information
- [ ] Verify email address

### 1.2 Get API Keys (Test Mode)
- [ ] Go to Developers > API keys
- [ ] Copy **Publishable key** (pk_test_...)
- [ ] Copy **Secret key** (sk_test_...)
- [ ] Save keys securely (password manager)

### 1.3 Create Products & Prices (Test Mode)

#### Base Subscription
- [ ] Go to Products > Add product
- [ ] Name: "Koffers Base Plan"
- [ ] Description: "3 banks, 100 AI chats/month, 5GB storage"
- [ ] Pricing model: Recurring
- [ ] Billing period: Yearly
- [ ] Price: $21 USD
- [ ] Copy **Price ID** (price_...)
- [ ] Save as `NEXT_PUBLIC_STRIPE_PRICE_BASE`

#### Add-on: Banks
- [ ] Create product: "+3 Banks Add-on"
- [ ] Description: "Add 3 more bank connections"
- [ ] Recurring, yearly, $10 USD
- [ ] Copy **Price ID**
- [ ] Save as `NEXT_PUBLIC_STRIPE_PRICE_ADDON_BANKS`

#### Add-on: Chats
- [ ] Create product: "+100 AI Chats Add-on"
- [ ] Description: "Add 100 more AI chats per month"
- [ ] Recurring, yearly, $8 USD
- [ ] Copy **Price ID**
- [ ] Save as `NEXT_PUBLIC_STRIPE_PRICE_ADDON_CHATS`

#### Add-on: Storage
- [ ] Create product: "+10GB Storage Add-on"
- [ ] Description: "Add 10GB more storage"
- [ ] Recurring, yearly, $5 USD
- [ ] Copy **Price ID**
- [ ] Save as `NEXT_PUBLIC_STRIPE_PRICE_ADDON_STORAGE`

### 1.4 Set Up Webhooks (Test Mode)
- [ ] Go to Developers > Webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://koffers.ai/api/stripe/webhook`
- [ ] Select events:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Copy **Signing secret** (whsec_...)
- [ ] Save as `STRIPE_WEBHOOK_SECRET`

### 1.5 Configure Customer Portal
- [ ] Go to Settings > Customer portal
- [ ] Enable "Allow customers to update payment methods"
- [ ] Enable "Allow customers to view billing history"
- [ ] Enable "Allow customers to cancel subscriptions"
- [ ] Set cancellation behavior: "Cancel at end of billing period"
- [ ] Save settings

## Phase 2: Appwrite Database Setup ⏳

### 2.1 Create Subscriptions Collection
- [ ] Go to Appwrite Console
- [ ] Navigate to Databases > koffers_poc
- [ ] Create new collection: `subscriptions`
- [ ] Set permissions:
  - [ ] Read: `users` (any authenticated user)
  - [ ] Create: `users`
  - [ ] Update: `any` (for server-side webhook updates)
  - [ ] Delete: `users`

### 2.2 Create Collection Attributes

Create these attributes in the `subscriptions` collection:

#### User & Stripe IDs
- [ ] `userId` - String, required, size: 255
- [ ] `stripeCustomerId` - String, required, size: 255
- [ ] `stripeSubscriptionId` - String, required, size: 255

#### Subscription Status
- [ ] `status` - String, required, size: 50
  - Enum values: active, canceled, past_due, incomplete
- [ ] `currentPeriodEnd` - DateTime, required
- [ ] `cancelAtPeriodEnd` - Boolean, required, default: false

#### Plan & Add-ons
- [ ] `basePlan` - Boolean, required, default: true
- [ ] `basePlanPriceId` - String, required, size: 255
- [ ] `addonBanks` - Integer, required, default: 0, min: 0
- [ ] `addonChats` - Integer, required, default: 0, min: 0
- [ ] `addonStorage` - Integer, required, default: 0, min: 0

#### Limits (Calculated from base + add-ons)
- [ ] `maxBanks` - Integer, required, default: 3, min: 0
- [ ] `maxChatsPerMonth` - Integer, required, default: 100, min: 0
- [ ] `maxStorageGB` - Integer, required, default: 5, min: 0

#### Current Usage
- [ ] `currentBanksConnected` - Integer, required, default: 0, min: 0
- [ ] `currentChatsUsed` - Integer, required, default: 0, min: 0
- [ ] `currentStorageUsedGB` - Float, required, default: 0, min: 0

#### Usage Reset
- [ ] `usageResetAt` - DateTime, required

#### Timestamps
- [ ] `createdAt` - DateTime, required
- [ ] `updatedAt` - DateTime, required

### 2.3 Create Indexes
- [ ] Index: `userId` (ASC) - for fast user lookup
- [ ] Index: `stripeCustomerId` (ASC) - for webhook lookups
- [ ] Index: `stripeSubscriptionId` (ASC) - for webhook lookups
- [ ] Index: `status` (ASC) - for filtering active subscriptions

## Phase 3: Environment Variables Setup ⏳

### 3.1 Add to .env.local (Development)

Create/update `.env.local` with:

```bash
# Stripe API Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (Test Mode)
NEXT_PUBLIC_STRIPE_PRICE_BASE=price_...
NEXT_PUBLIC_STRIPE_PRICE_ADDON_BANKS=price_...
NEXT_PUBLIC_STRIPE_PRICE_ADDON_CHATS=price_...
NEXT_PUBLIC_STRIPE_PRICE_ADDON_STORAGE=price_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] Add all Stripe environment variables
- [ ] Verify no syntax errors
- [ ] Restart dev server

### 3.2 Add to Vercel (Production)
- [ ] Go to Vercel Dashboard
- [ ] Select koffers-web project
- [ ] Settings > Environment Variables
- [ ] Add each variable:
  - [ ] `STRIPE_SECRET_KEY` (Production)
  - [ ] `STRIPE_WEBHOOK_SECRET` (Production)
  - [ ] `NEXT_PUBLIC_STRIPE_PRICE_BASE` (Production)
  - [ ] `NEXT_PUBLIC_STRIPE_PRICE_ADDON_BANKS` (Production)
  - [ ] `NEXT_PUBLIC_STRIPE_PRICE_ADDON_CHATS` (Production)
  - [ ] `NEXT_PUBLIC_STRIPE_PRICE_ADDON_STORAGE` (Production)
  - [ ] `NEXT_PUBLIC_APP_URL` = `https://koffers.ai` (Production)
- [ ] Click "Save" for each
- [ ] Trigger new deployment

## Phase 4: Local Testing ⏳

### 4.1 Install Stripe CLI (Optional but Recommended)
```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
- [ ] Install Stripe CLI
- [ ] Login to Stripe
- [ ] Start webhook forwarding
- [ ] Copy webhook secret to `.env.local`

### 4.2 Test Checkout Flow
- [ ] Start dev server: `npm run dev`
- [ ] Login as test user (user@test.com / qwe123qwe)
- [ ] Go to Settings > Billing
- [ ] Click "Subscribe Now"
- [ ] Verify redirects to Stripe Checkout
- [ ] Use test card: 4242 4242 4242 4242
- [ ] Complete checkout
- [ ] Verify redirect back to billing page with success message
- [ ] Check Appwrite: subscription document created
- [ ] Check Stripe Dashboard: customer and subscription created

### 4.3 Test Add-on Purchase
- [ ] Ensure you have active subscription
- [ ] Click "Add +3 Banks" button
- [ ] Confirm in modal
- [ ] Verify subscription updated
- [ ] Check Appwrite: addonBanks incremented, maxBanks updated
- [ ] Check Stripe Dashboard: subscription has new line item

### 4.4 Test Customer Portal
- [ ] Click "Manage Subscription"
- [ ] Verify redirects to Stripe Customer Portal
- [ ] Test updating payment method
- [ ] Test viewing invoices
- [ ] Test canceling subscription
- [ ] Verify redirect back to billing page
- [ ] Check Appwrite: status updated to canceled (if canceled)

### 4.5 Test Webhook Events
- [ ] Check Stripe CLI output for webhook events
- [ ] Verify `customer.subscription.created` handled
- [ ] Verify `customer.subscription.updated` handled
- [ ] Create test payment failure in Stripe Dashboard
- [ ] Verify `invoice.payment_failed` handled
- [ ] Check server logs for any webhook errors

## Phase 5: Production Deployment 🚀

### 5.1 Create Live Mode Products (Repeat Step 1.3)
- [ ] Switch to Live mode in Stripe Dashboard
- [ ] Create base subscription product ($21/year)
- [ ] Create 3 add-on products ($10, $8, $5/year)
- [ ] Copy all LIVE price IDs
- [ ] Save to Vercel environment variables

### 5.2 Get Live API Keys
- [ ] Go to Developers > API keys (Live mode)
- [ ] Copy **Secret key** (sk_live_...)
- [ ] Save to Vercel as `STRIPE_SECRET_KEY`
- [ ] Update webhook secret if needed

### 5.3 Configure Live Webhook
- [ ] Go to Developers > Webhooks (Live mode)
- [ ] Add endpoint: `https://koffers.ai/api/stripe/webhook`
- [ ] Select same events as test mode
- [ ] Copy **Signing secret**
- [ ] Save to Vercel as `STRIPE_WEBHOOK_SECRET`
- [ ] Test webhook with "Send test webhook" button

### 5.4 Activate Live Mode
- [ ] Verify all environment variables in Vercel
- [ ] Deploy to production
- [ ] Check deployment logs for errors
- [ ] Verify webhook endpoint responds to Stripe

### 5.5 Production Testing
- [ ] Create real test account (not user@test.com)
- [ ] Complete real checkout with real card
- [ ] Verify subscription created in Appwrite
- [ ] Verify charges in Stripe Dashboard
- [ ] Test add-on purchase
- [ ] Test customer portal
- [ ] Monitor for any errors

## Phase 6: Go-Live Checklist 🎉

### 6.1 Pre-Launch
- [ ] Verify all tests passing
- [ ] Check error monitoring (Sentry/etc)
- [ ] Verify webhook signature validation working
- [ ] Test with multiple browsers
- [ ] Test on mobile devices
- [ ] Review Stripe Dashboard for test transactions
- [ ] Clear any test data from Appwrite

### 6.2 Launch
- [ ] Announce billing feature to users
- [ ] Monitor Stripe Dashboard for first subscriptions
- [ ] Monitor Appwrite for subscription documents
- [ ] Check server logs for any errors
- [ ] Be ready to handle support requests

### 6.3 Post-Launch Monitoring
- [ ] Monitor webhook success rate (Stripe Dashboard > Webhooks)
- [ ] Check for failed webhooks and retry if needed
- [ ] Monitor subscription churn
- [ ] Track add-on adoption
- [ ] Monitor for payment failures
- [ ] Review customer portal usage

## Phase 7: Optional Enhancements 🔮

### 7.1 Email Notifications
- [ ] Send welcome email on subscription
- [ ] Send receipt email on payment
- [ ] Send payment failed email
- [ ] Send subscription canceled email
- [ ] Send usage limit warning emails

### 7.2 Usage Enforcement
- [ ] Check `currentBanksConnected` against `maxBanks` before allowing new connections
- [ ] Check `currentChatsUsed` against `maxChatsPerMonth` before AI queries
- [ ] Check `currentStorageUsedGB` against `maxStorageGB` before uploads
- [ ] Show "Upgrade" prompt when limits reached

### 7.3 Analytics & Insights
- [ ] Track subscription conversion rate
- [ ] Track add-on purchase rate
- [ ] Track churn rate and reasons
- [ ] A/B test pricing
- [ ] Track lifetime value (LTV)

### 7.4 Advanced Features
- [ ] Add monthly billing option
- [ ] Add free trial (7 or 14 days)
- [ ] Add referral program
- [ ] Add annual discount promotion
- [ ] Add team/multi-user plans

## Troubleshooting Guide

### Webhook Signature Verification Fails
**Symptoms**: Webhooks return 400 error, logs show "Invalid signature"

**Solutions**:
- [ ] Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- [ ] Check you're using correct mode (test vs live)
- [ ] Ensure webhook endpoint URL is exact
- [ ] Check for middleware modifying request body
- [ ] Use Stripe CLI to test locally

### Subscription Not Created After Checkout
**Symptoms**: Checkout succeeds but no document in Appwrite

**Solutions**:
- [ ] Check webhook is configured and active
- [ ] Check server logs for webhook handler errors
- [ ] Verify Appwrite permissions allow document creation
- [ ] Check for Appwrite API errors
- [ ] Manually trigger webhook from Stripe Dashboard

### Add-on Not Reflecting in Subscription
**Symptoms**: Add-on purchased but limits not updated

**Solutions**:
- [ ] Check `customer.subscription.updated` webhook received
- [ ] Verify price IDs match environment variables
- [ ] Check webhook handler logic for add-on counting
- [ ] Check Appwrite document for updated values
- [ ] Review Stripe subscription items in Dashboard

### Customer Portal Not Loading
**Symptoms**: "Manage Subscription" redirects fail or error

**Solutions**:
- [ ] Verify subscription has `stripeCustomerId`
- [ ] Check Customer Portal is configured in Stripe
- [ ] Verify `NEXT_PUBLIC_APP_URL` is correct
- [ ] Check server logs for portal creation errors
- [ ] Test with different browsers

## Support Resources

- **Stripe Docs**: https://stripe.com/docs
- **Stripe API Reference**: https://stripe.com/docs/api
- **Appwrite Docs**: https://appwrite.io/docs
- **Stripe Test Cards**: https://stripe.com/docs/testing
- **Webhook Testing**: https://stripe.com/docs/webhooks/test

## Success Criteria

The implementation is complete when:
- [ ] Users can subscribe to base plan
- [ ] Users can purchase add-ons
- [ ] Usage limits are tracked in Appwrite
- [ ] Webhooks sync Stripe to Appwrite
- [ ] Customer Portal works for managing subscription
- [ ] Checkout success/cancel flows work
- [ ] All environment variables configured
- [ ] Production testing successful
- [ ] No errors in logs for 24 hours post-launch
