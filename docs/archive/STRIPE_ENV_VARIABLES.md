# Stripe Environment Variables

This document lists all the environment variables needed for the Stripe integration to work.

## Required Environment Variables

Add these to your `.env.local` file for development and to Vercel environment variables for production:

### Stripe API Keys

```bash
# Stripe Secret Key (from Stripe Dashboard > Developers > API keys)
STRIPE_SECRET_KEY=sk_test_... # Test mode
# STRIPE_SECRET_KEY=sk_live_... # Production mode

# Stripe Webhook Secret (from Stripe Dashboard > Developers > Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Stripe Price IDs

These are the price IDs for each product/plan. You'll get these after creating products in Stripe.

```bash
# Base Subscription ($21/year)
NEXT_PUBLIC_STRIPE_PRICE_BASE=price_...

# Add-on: +3 Banks ($10/year)
NEXT_PUBLIC_STRIPE_PRICE_ADDON_BANKS=price_...

# Add-on: +100 AI Chats ($8/year)
NEXT_PUBLIC_STRIPE_PRICE_ADDON_CHATS=price_...

# Add-on: +10GB Storage ($5/year)
NEXT_PUBLIC_STRIPE_PRICE_ADDON_STORAGE=price_...
```

### App URL

```bash
# Your app's public URL (used for Stripe redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Development
# NEXT_PUBLIC_APP_URL=https://koffers.ai # Production
```

## How to Get These Values

### 1. Stripe Secret Key

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** > **API keys**
3. Copy the **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for production)
4. Add to `.env.local` as `STRIPE_SECRET_KEY`

### 2. Create Stripe Products

Follow the instructions in `docs/STRIPE_SETUP_BASE_PLUS_ADDONS.md` to create:

1. **Base Subscription** - $21/year
   - Name: "Koffers Base Plan"
   - Description: "3 banks, 100 AI chats/month, 5GB storage"
   - Billing: Recurring, annual
   - Price: $21 USD
   - Copy the **Price ID** (starts with `price_`)

2. **Add-on: Banks** - $10/year
   - Name: "+3 Banks Add-on"
   - Description: "Add 3 more bank connections"
   - Billing: Recurring, annual
   - Price: $10 USD
   - Copy the **Price ID**

3. **Add-on: Chats** - $8/year
   - Name: "+100 AI Chats Add-on"
   - Description: "Add 100 more AI chats per month"
   - Billing: Recurring, annual
   - Price: $8 USD
   - Copy the **Price ID**

4. **Add-on: Storage** - $5/year
   - Name: "+10GB Storage Add-on"
   - Description: "Add 10GB more storage"
   - Billing: Recurring, annual
   - Price: $5 USD
   - Copy the **Price ID**

### 3. Set Up Webhook

1. Go to **Developers** > **Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Set endpoint URL:
   - Development: Use [Stripe CLI](https://stripe.com/docs/stripe-cli) for local testing
   - Production: `https://koffers.ai/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Example .env.local File

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_51AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_WEBHOOK_SECRET=whsec_abcdefghijklmnopqrstuvwxyz1234567890

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_BASE=price_1AbCdEfGhIjKlMnO
NEXT_PUBLIC_STRIPE_PRICE_ADDON_BANKS=price_2BcDeFgHiJkLmNoP
NEXT_PUBLIC_STRIPE_PRICE_ADDON_CHATS=price_3CdEfGhIjKlMnOpQ
NEXT_PUBLIC_STRIPE_PRICE_ADDON_STORAGE=price_4DeFgHiJkLmNoPqR

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Vercel Environment Variables

When deploying to production, add these same variables in:

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add each variable with production values
5. Select **Production** environment
6. Click **Save**

## Testing Locally with Stripe CLI

For local development, you can use the Stripe CLI to forward webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local endpoint
stripe listen --forward-to localhost:3000/api/stripe/webhook

# This will output a webhook signing secret (whsec_...)
# Use this as STRIPE_WEBHOOK_SECRET in .env.local
```

## Switching Between Test and Production

### Test Mode (Development)
- Use `sk_test_...` for secret key
- Use test price IDs (created in test mode)
- Use test webhook secret
- Payments will not charge real cards

### Live Mode (Production)
- Use `sk_live_...` for secret key
- Create SEPARATE products/prices in live mode
- Use live webhook secret (separate endpoint in Stripe)
- Payments WILL charge real cards

**IMPORTANT**: Never mix test and live mode credentials. They are completely separate environments in Stripe.

## Security Notes

- **NEVER commit `.env.local` to git** - it's already in `.gitignore`
- **NEVER expose `STRIPE_SECRET_KEY` to the client** - it must only be used server-side
- **Public variables** (starting with `NEXT_PUBLIC_`) are safe to expose to the client
- **Webhook secrets** verify that webhooks come from Stripe - keep them private
- **Rotate keys** if they're ever exposed or compromised

## Troubleshooting

### Webhook signature verification fails
- Check that `STRIPE_WEBHOOK_SECRET` matches the endpoint in Stripe Dashboard
- Make sure you're using the correct environment (test vs live)
- Verify the webhook endpoint URL is correct

### Price IDs not found
- Verify price IDs are correct in environment variables
- Make sure you're using the same mode (test vs live) for all credentials
- Check that prices are set to "Recurring" billing, not "One-time"

### Checkout session fails
- Check that `NEXT_PUBLIC_APP_URL` is correct
- Verify `STRIPE_SECRET_KEY` is valid and for the correct environment
- Look at server logs for detailed error messages
