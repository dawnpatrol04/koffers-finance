# Koffers Cost Analysis & Pricing Structure

**Date:** November 13, 2025
**Status:** Pre-Launch Cost Research
**Monthly Subscription Price:** $19.99

---

## Fixed Costs Per User

### Plaid API (Bank Connections)
- **Rate:** $0.30 per bank connection per month
- **Model:** Subscription (fixed monthly cost)
- **Charged:** Immediately when user connects bank
- **Average User (2 banks):** $0.60/month
- **Power User (5 banks):** $1.50/month
- **⚠️ Critical:** No free trial - you pay even if user doesn't convert

**Action Required:** Must call `plaid.itemRemove()` when user cancels/doesn't pay to stop charges

---

## Variable Costs Per User

### Stripe Payment Processing
- **Rate:** 2.9% + $0.30 per successful charge
- **Model:** Per-transaction fee
- **Monthly Calculation:**
  - Charge: $19.99
  - Stripe fee: ($19.99 × 0.029) + $0.30 = **$0.88**
  - Net revenue: $19.99 - $0.88 = **$19.11**

### Claude Sonnet 4.5 API (AI Chat Assistant)
- **Input tokens:** $3 per million tokens (≤200K context)
- **Output tokens:** $15 per million tokens (≤200K context)

**Estimated Usage per User:**
- Average chat session: ~2,000 input + ~1,000 output tokens
- Moderate usage (10 chats/month): **~$0.05/month**
- Heavy usage (50 chats/month): **~$0.25/month**
- Power user (100 chats/month): **~$0.50/month**

**Note:** Actual costs depend heavily on:
- Chat frequency
- Conversation length
- Tool calling (transaction queries, etc.)

---

## Infrastructure Costs

### Appwrite Cloud (Backend/Database)
**Current Plan:** Likely need Pro Plan at scale

**Pro Plan Base:** $25/month includes:
- 2TB bandwidth
- 150GB storage
- 1.75M database reads
- 750K database writes
- 3.5M function executions

**Overages (pay-as-you-go):**
- Bandwidth: $15 per 100GB
- Storage: $2.80 per 100GB
- Database reads: $0.06 per 100K reads
- Database writes: $0.10 per 100K writes

**Estimated for 100 users:**
- Pro plan base: $25/month
- Additional reads/writes: ~$5-10/month
- **Total: ~$30-35/month**

**Estimated for 1,000 users:**
- Pro plan base: $25/month
- Additional bandwidth/reads/writes: ~$50-100/month
- **Total: ~$75-125/month**

### Vercel (Frontend Hosting)
**Current Plan:** Hobby (Free) - sufficient for early launch

**Free Tier Includes:**
- 1M edge requests/month
- 100GB bandwidth/month
- 1M function invocations/month

**When to upgrade:** At ~500-1,000 active users
- **Pro Plan:** $20/month + usage
- Includes $20 credit + higher limits

**Estimated at scale (1,000 users):**
- Likely stay within Hobby free tier initially
- May need Pro ($20/month) at 1,000+ users

---

## Total Cost Per User Breakdown

### Conservative Estimate (Average User)
**Assumptions:** 2 bank connections, 10 chats/month

| Cost Item | Monthly Cost |
|-----------|-------------|
| Plaid (2 banks) | $0.60 |
| Stripe fee | $0.88 |
| Claude API | $0.05 |
| Appwrite (allocated) | $0.30 |
| Vercel (allocated) | $0.10 |
| **TOTAL COST** | **$1.93** |
| **REVENUE** | **$19.99** |
| **GROSS MARGIN** | **$18.06 (90.3%)** |

### Moderate Estimate (Active User)
**Assumptions:** 3 bank connections, 30 chats/month

| Cost Item | Monthly Cost |
|-----------|-------------|
| Plaid (3 banks) | $0.90 |
| Stripe fee | $0.88 |
| Claude API | $0.15 |
| Appwrite (allocated) | $0.35 |
| Vercel (allocated) | $0.15 |
| **TOTAL COST** | **$2.43** |
| **REVENUE** | **$19.99** |
| **GROSS MARGIN** | **$17.56 (87.8%)** |

### Power User Estimate
**Assumptions:** 5 bank connections, 100 chats/month

| Cost Item | Monthly Cost |
|-----------|-------------|
| Plaid (5 banks) | $1.50 |
| Stripe fee | $0.88 |
| Claude API | $0.50 |
| Appwrite (allocated) | $0.45 |
| Vercel (allocated) | $0.20 |
| **TOTAL COST** | **$3.53** |
| **REVENUE** | **$19.99** |
| **GROSS MARGIN** | **$16.46 (82.3%)** |

---

## Scale Analysis

### At 100 Paying Users
**Monthly Revenue:** $1,999
**Monthly Costs:**
- Plaid: ~$60 (avg 2 banks)
- Stripe: $88
- Claude: $5-15
- Appwrite: $30-35
- Vercel: $0 (free tier)
- **Total: ~$183-198**

**Gross Profit:** ~$1,801-1,816 (90% margin)

### At 1,000 Paying Users
**Monthly Revenue:** $19,990
**Monthly Costs:**
- Plaid: ~$600 (avg 2 banks)
- Stripe: $880
- Claude: $50-250
- Appwrite: $75-125
- Vercel: $20-50
- **Total: ~$1,625-1,905**

**Gross Profit:** ~$18,085-18,365 (90-92% margin)

---

## Critical Risks & Mitigation

### 1. Free Trial Problem ⚠️
**Issue:** Plaid charges immediately when user connects bank. With 1-2% conversion:
- 100 free trials = 98 don't convert
- Cost: 98 users × $0.60 = **$58.80 loss**
- Plus Claude API costs for trial usage

**Mitigation Options:**
1. **No free trial** - Require credit card upfront
2. **Limited trial** - Restrict bank connections until paid
3. **Automatic cleanup** - Call `plaid.itemRemove()` for non-converts
4. **Absorb cost** - Factor into CAC (customer acquisition cost)

**Recommendation:** Require credit card upfront, offer 7-day money-back guarantee instead of free trial

### 2. Claude API Abuse
**Issue:** Heavy chat usage could drive costs up significantly

**Mitigation:**
- Rate limiting (e.g., 50 chats/day)
- Usage monitoring per user
- Disable chat for non-paying users immediately

### 3. Plaid Zombie Connections
**Issue:** Users cancel but we forget to remove Plaid items → ongoing $0.30/month charges

**Mitigation:**
- Automated webhook on Stripe cancellation → call `plaid.itemRemove()`
- Weekly audit of Plaid items vs active subscriptions
- Alert system for mismatches

---

## Pricing Strategy Validation

### Current Pricing: $19.99/month
**Gross Margin:** 87-90%
**Unit Economics:** ✅ Healthy

**Break-even per user:** ~$2.50/month
**Safety margin:** 8x+ over costs

### Competitive Position
- Mint: Free (ad-supported, sold to Intuit, shut down)
- YNAB: $14.99/month (manual entry, no Plaid)
- Copilot: $13.99/month (basic features)
- Monarch: $14.95/month (similar features)

**Koffers at $19.99:** Premium positioning justified by AI assistant + receipt processing

---

## Recommendations

### Before Launch (Required)
1. ✅ Disable Plaid Balance product (not using, saves $0.10/call if accidentally called)
2. ⚠️ Implement Plaid cleanup automation (critical to avoid zombie charges)
3. ⚠️ Set up Stripe webhooks for subscription lifecycle
4. ⚠️ Add Claude API rate limiting
5. ⚠️ Create Appwrite budget alerts

### Free Trial Decision
**Recommendation:** Credit card required upfront

**Rationale:**
- Plaid costs are immediate and non-refundable
- Low conversion (1-2%) makes free trials expensive
- Better to offer 7-day money-back guarantee
- Filters out tire-kickers

### Pricing Tiers (Future Consideration)
With 90% margins, could offer:
- **Basic: $9.99/month** - 2 bank connections, 25 chats/month
- **Pro: $19.99/month** - Unlimited banks, unlimited chats (current)
- **Teams: $49.99/month** - 5 users, shared accounts

---

## Cost Monitoring Checklist

### Weekly
- [ ] Plaid items vs active subscriptions audit
- [ ] Claude API spending by user
- [ ] Failed payment cleanup (remove Plaid items)

### Monthly
- [ ] Appwrite usage vs plan limits
- [ ] Vercel bandwidth/function usage
- [ ] Average cost per user calculation
- [ ] Gross margin validation

### Alerts to Set Up
- Appwrite: 75% of bandwidth/storage/reads
- Stripe: Failed payment webhook
- Claude: User exceeds $1/month in API costs
- Plaid: Item exists but no active subscription

---

## Summary

**Strong unit economics:** 87-90% gross margins
**Main cost driver:** Plaid bank connections ($0.30-1.50/user)
**Biggest risk:** Free trials with Plaid costs
**Recommendation:** Credit card required, implement cleanup automation before launch

**Next Steps:**
1. Create Stripe account for Koffers
2. Implement subscription billing
3. Build Plaid cleanup automation
4. Set up cost monitoring alerts
5. Test full payment → cancellation → cleanup flow
