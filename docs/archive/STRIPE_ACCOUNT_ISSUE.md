# Stripe Account Structure Issue - URGENT

## Problem Discovery: November 14, 2025

### Current (INCORRECT) Structure

**Koffers Organization** (org_6TcVem9BSQ70CAz9BhBu1mS)
- Contains 3 accounts:
  - "Koffers" account (with folder icon)
  - "K Koffers" account (acct_1ST7jA4s0c5LoAna) - **SANDBOX MODE**
  - "T Trestles" account - **PRODUCTION MODE**

### Separate Standalone Accounts (CORRECT structure for these)
- billme_v3
- ParsonsAI
- Plant Monitor
- smartmint

## Why This Is Wrong

According to Stripe documentation:
> "You must use separate Stripe accounts for projects, websites, or businesses that operate independently from one another."

**Koffers and Trestles are:**
- Different businesses
- Different products/services
- Should have different legal entities
- Should have different tax IDs
- Should appear differently on customer statements

**Organizations should only be used when:**
> "Multiple accounts relate to the same business, such as for local acquiring or maintaining separate business lines"

**Trestles is already in PRODUCTION** with real customers and transactions. Koffers is still in development/sandbox.

## Risks

1. **Financial confusion**: Customer payments might be mixed between businesses
2. **Tax/legal issues**: Two separate businesses shouldn't share an organization
3. **Branding confusion**: Customers might see wrong business name on statements
4. **Production/Test mixing**: Trestles is production, Koffers is sandbox - this shouldn't be in same org

## Current State - What We Found

### K Koffers Account (acct_1ST7jA4s0c5LoAna) - SANDBOX
Has 4 products created Nov 13:
- Koffers Base Plan: $21.00/year (prod_TPxhAB6pb80pV3, price_1ST7mE4s0c5LoAna9xgSRYF0)
- +3 Banks Add-on: $10.00/year (prod_TPxiT08Bdre3Mr)
- +100 AI Chats Add-on: $8.00/year (prod_TPxjNjx6w1X3oA)
- +10GB Storage Add-on: $5.00/year (prod_TPxjx7Oobmy6DG)

**Missing:** Priority Support product

### Products Created Via CLI Earlier (Unknown Location)
When we ran `stripe products create` we created 5 products with DIFFERENT prices:
- Koffers: $21.04/year (prod_TQKRu5YDU4K1Sr, price_1STTmgGCOJxakAdChZ9xv1nr)
- Additional Banks: $3.60/year (prod_TQKRfLUcamGZXi, price_1STTmtGCOJxakAdCdig3GZWo)
- Extra Storage: $12/year (prod_TQKRUfHHHAJCot, price_1STTncGCOJxakAdCO1Ftioei)
- Extra AI Tokens: $14.40/year (prod_TQKRS0vkLGjE7K, price_1STTmuGCOJxakAdCMDxCKj67)
- Priority Support: $60/year (prod_TQKRXYtvbKgw5u, price_1STTmvGCOJxakAdCMiyTFXQz)

**These are in a different account!** Need to determine which one.

## Questions to Answer

1. ✅ Are Koffers and Trestles legally separate businesses? **YES**
2. ❓ Which Stripe account should Koffers products be in?
3. ❓ How did Koffers and Trestles end up in the same organization?
4. ❓ Can we remove Trestles from the organization without disrupting production?
5. ❓ Should we keep "K Koffers" account or create a brand new standalone Koffers account?

## Action Plan Options

### Option A: Remove Trestles from Organization (Cleanest)
1. Contact Stripe support to remove Trestles account from Koffers organization
2. Keep K Koffers account as standalone Koffers account
3. Verify products, migrate to production mode when ready

**Pros:**
- Keeps existing Koffers products/setup
- Clean separation

**Cons:**
- May require Stripe support intervention
- Could take time

### Option B: Create New Standalone Koffers Account (Safest)
1. Create brand new Stripe account for Koffers (completely separate)
2. Recreate all 5 products in new account
3. Update environment variables to point to new account
4. Leave the organization mess alone (don't touch production Trestles)

**Pros:**
- No risk to Trestles production account
- Complete clean slate
- No Stripe support needed

**Cons:**
- Have to recreate products
- Update all IDs in code

### Option C: Use One of the Other Koffers Accounts
The organization shows "Koffers (2)" and "K Koffers" - maybe there are already 2 Koffers accounts?

1. Investigate what "Koffers (2)" account is
2. If it's clean/unused, use that one
3. Otherwise fall back to Option B

## Recommendation

**I recommend Option B (Create New Standalone Account)** because:

1. **Zero risk to Trestles production** - We won't touch anything related to Trestles
2. **Fast** - Can do it right now, no waiting for support
3. **Clean** - No legacy organization baggage
4. **Standard** - Matches your other businesses (billme_v3, ParsonsAI, etc.)

## Next Steps

1. Get user confirmation on which option to pursue
2. If Option B: Create new Koffers account and recreate products
3. Update .env.local and Vercel environment variables
4. Set up webhook endpoint
5. Test Phase 1 Foundation with new account
