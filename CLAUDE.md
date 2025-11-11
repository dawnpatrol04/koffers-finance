# CLAUDE.md - Current Mission

**🚨 THIS IS NOT SANDBOX DATA! THIS IS PRODUCTION ONLY! NOTHING IS MOCK OR SANDBOX! 🚨**
**🚨 WE ARE USING REAL PLAID PRODUCTION DATA - NOT SANDBOX TEST DATA! 🚨**

**⚠️ PRIMARY KOFFERS ACCOUNT (MCP Connected):**
- Email: dawnpatrol04@gmail.com
- Password: qwe123qwe
- **USE THIS ACCOUNT FOR ALL TESTING - MCP is connected to this user**

**⚠️ NOT WORKING ON LOCALHOST! All testing must be done on production (koffers.ai)**
**⚠️ ONLY DEPLOY WITH VERCEL CLI! DO NOT USE GITHUB PUSH TO DEPLOY - IT CAUSES ISSUES!**

## WORKING DIRECTIVE

**KEEP GOING. DO NOT STOP. JUST KEEP GOING.**

Once you finish what you're working on, figure out what else needs to be done and keep moving forward. Don't wait for instructions - be proactive and maintain momentum.

**Self-Direction Protocol:**
- If you finish all tasks, ask yourself what's next, and then do that
- Just keep going and going and going
- Maintain continuous forward momentum without waiting for instructions
- Identify the next logical task based on the current state of the project
- Be proactive - don't stop until explicitly told to stop

## PRIMARY MISSION: Copy EXACT Midday Dashboard Components

**CRITICAL RULE**: DO NOT RECREATE - COPY AND PASTE COMPONENTS FROM MIDDAY

### Why This Matters
When we recreate components, we lose the polish and quality. Components must be copied directly from Midday's codebase and only modified for:
1. Data layer changes (Appwrite instead of tRPC)
2. Content/branding changes (Koffers instead of Midday)
3. Backend integration points

**NEVER change:**
- Component structure
- Styling/CSS classes
- Visual design
- UI patterns
- Interactions
- Animations

## COMPLETED TASKS ✓

### Dashboard Components - DONE
- [x] Sidebar navigation component with hover-expand animation (70px → 240px)
- [x] Main menu with dropdown sub-items and staggered animations
- [x] Team dropdown with Framer Motion physics
- [x] Header/top navigation
- [x] Dashboard layout wrapper
- [x] Icons library (100+ icons)
- [x] User menu/avatar component

### Settings Pages - DONE ✅
- [x] Settings layout with tab navigation - FULLY WORKING
- [x] General settings (company logo, name, email, country, delete team)
- [x] Billing settings (Starter & Pro pricing plans)
- [x] Accounts settings (Plaid bank connections with real data)
- [x] Members settings (placeholder with proper UI)
- [x] Notifications settings (placeholder with proper UI)
- [x] Developer settings (placeholder with proper UI)
- [x] All settings tabs functional with active state highlighting
- [x] Deployed and verified at https://koffers.ai/dashboard/settings/*

### Infrastructure - DONE
- [x] React Query / TanStack Query setup with QueryClientProvider
- [x] tRPC client placeholders (with TODO comments for Appwrite integration)
- [x] use-user hook adapter for Appwrite UserContext
- [x] Placeholder header components (connection-status, notification-center, trial, etc.)

### Plaid Integration - DONE ✅
- [x] PlaidLink component with link token generation
- [x] Token exchange endpoint storing items in Appwrite
- [x] Fetch data endpoint pulling accounts and transactions (24 months, paginated)
- [x] Transactions API endpoint with query support
- [x] Accounts API endpoint
- [x] Transactions widget component (dashboard)
- [x] Accounts widget component (dashboard)
- [x] Full transactions page with filtering (all/income/expense/pending)
- [x] Transaction sorting (date/amount/name)
- [x] All deployed to production at koffers.ai
- [x] **VERIFIED IN PRODUCTION**: Successfully connected Chase sandbox account
  - 3 accounts connected: Plaid Checking ($110), Plaid Saving ($210), Plaid Credit Card ($410)
  - 42 transactions fetched and displaying correctly
  - Total balance: $730.00
  - All widgets rendering with real data
  - Screenshots: dashboard-with-plaid-data-connected.png, transactions-page-full-list.png

## CURRENT STATUS - AS OF NOV 10, 2025

**🚨 CRITICAL FINDING: Transaction Import Issue**

### What We Discovered
- **Plaid API works perfectly**: Returns all 3,787 transactions spanning Nov 2023 - Nov 2025 (24 months) ✅
- **Database has only 131 transactions**: The import process is failing/timing out ❌
- **Root cause**: The `/api/plaid/fetch-data` endpoint tries to fetch AND store all 3,787 transactions in one request, causing timeout
- **MCP refresh_transactions hangs**: It calls fetch-data which takes too long (>60 seconds)

### Technical Details
- Plaid `/transactions/sync` returns data in 8 pages (500 transactions each)
- Total: 3,787 transactions from Nov 12, 2023 to Nov 10, 2025
- Current approach: Fetch all pages, then loop through storing each one in Appwrite
- Problem: Appwrite `createDocument` is slow when called 3,787 times sequentially
- Solution needed: Background job or chunked import

### Correct Plaid Credentials (from Vercel)
```
PLAID_CLIENT_ID="68b9e82f3cf4fb0023141767"
PLAID_SECRET="e9014837be734871fcdb6c3ea51e7c"
```
Note: `.env.production` has wrong secret, Vercel env vars are correct.

**🎉 MAJOR MILESTONE: Phase 4 & 5 Complete!**

### ✅ FULLY COMPLETED & DEPLOYED

**Phase 3: POC - Data Exploration**
- All 10 tasks complete
- 3 bank accounts connected ($730 total balance)
- 42 transactions loaded (24 months of data)

**Phase 4: Dashboard Infrastructure**
- All 7 tasks complete
- Landing page + Auth working
- Full dashboard with Midday components
- Sidebar with hover animations
- All routing functional

**Phase 5: Settings - Accounts Tab**
- 15/15 tasks complete
- All 6 settings tabs built and working
- Tab navigation with active states
- Plaid integration fully functional
- Real bank data displaying

**Phase 10: Transaction Management (PARTIAL)**
- 5/10 tasks complete
- Transaction list, filtering, sorting working
- Dashboard widgets showing transactions

### 🚀 DEPLOYED TO PRODUCTION
- **Live URL:** https://koffers.ai
- **Test Account:** user@test.com / qwe123qwe

### ✅ VERIFIED WORKING
- Dashboard with real Plaid data
- All 6 settings pages accessible
- Settings tab navigation
- Bank account connections
- Transaction filtering & sorting
- Sidebar hover animations
- All forms and inputs styled correctly

## NEXT PRIORITY TASKS

According to Trestles project plan, the critical path forward is:

### 🎯 **IMMEDIATE NEXT:** Complete Phase 10 - Transaction Management (5 remaining tasks)

We have basic transactions working. Need to add:

1. **Transaction Detail View** (modal or page)
   - Show full transaction details
   - Display merchant info
   - Show category, notes, tags
   - Attach receipt images (future)

2. **Manual Transaction Entry**
   - Form to add transactions manually
   - Category selection
   - Amount, date, description
   - Save to Appwrite

3. **Advanced Search**
   - Search by merchant name
   - Search by amount range
   - Search by date range
   - Search by category

4. **Category Editing**
   - Click to edit transaction category
   - Auto-save to Appwrite
   - Show category dropdown

5. **Bulk Operations**
   - Select multiple transactions
   - Bulk categorize
   - Bulk delete
   - Bulk export

### 🔥 **AFTER PHASE 10:** Critical AI Features (The Differentiators!)

**Phase 12: AI Categorization** (10 tasks)
- Integrate Claude API
- Auto-categorize all transactions
- >90% accuracy goal
- Learn from user corrections

**Phase 13: Receipt Processing** (9 tasks)
- Upload receipt images
- Claude Vision OCR
- Extract line items
- Match to transactions

These AI features are what will set Koffers apart from competitors!

### Process for Each Component
1. Find the component in Midday's local copy at `/temp/midday/`
2. Copy the EXACT code
3. Update imports from `@midday/*` to `@/components/*`
4. Keep ALL styling, animations, and structure identical
5. Only modify data layer (Appwrite SDK) and content/branding

### Midday Source Locations
- Dashboard: `/temp/midday/apps/dashboard/src/`
- Components: `/temp/midday/packages/ui/src/`
- Local copy: `/Users/mikeparsons/Desktop/ProjectsV2/koffers_finance/temp/midday`

## Primary Test User (ALWAYS USE THIS FOR TESTING)
- Email: user@test.com
- Password: qwe123qwe

**IMPORTANT**: This is the ONLY test account to use for all testing and development. Always login with these credentials.

## Screenshots Taken
- `dashboard-with-midday-components.png` - Dashboard overview with sidebar
- `settings-page-general.png` - Settings/General tab
- `settings-notifications.png` - Settings/Notifications tab

---

# DEPLOYMENT WORKFLOW (CRITICAL - FOLLOW FOR NEXT 10-12 HOURS)

## The Incremental Deployment Process

**DO NOT MAKE BULK CHANGES.** Build incrementally, verify at each step.

### The Cycle (Repeat for Each Component/Feature):

1. **Make ONE small change** (add one component, one page, one feature)
2. **Test locally** - `npm run build` to verify it builds without errors
3. **Commit changes** - `git add . && git commit -m "descriptive message"`
4. **Push to GitHub** - `git push`
5. **Deploy to Vercel** - Use Vercel CLI: `vercel --prod` (faster than git integration)
6. **Check deployment logs** - Look for any errors in Vercel output
7. **CRITICAL: Take screenshot and VISUALLY VERIFY** - Use Playwright to take screenshot, READ the image, compare to Midday reference
8. **Loop up to 5 times to fix styling/layout** - If it doesn't match Midday exactly, fix and redeploy
9. **If it matches Midday** - Move to next component
10. **If it fails** - Fix the issue, repeat from step 2

### VISUAL VERIFICATION IS MANDATORY

**YOU MUST TAKE A SCREENSHOT AND READ IT AS AN IMAGE EVERY SINGLE TIME.**

The workflow without visual verification creates garbage that looks nothing like Midday. You CANNOT rely on:
- Text snapshots from Playwright
- Assuming components look right
- "It deployed successfully" = good enough

**EVERY deployment must:**
1. Take a screenshot with `mcp__playwright__browser_take_screenshot`
2. The screenshot returns an image that you CAN SEE
3. LOOK at the image and compare it to what Midday looks like
4. If spacing, colors, fonts, layout are wrong - FIX THEM
5. Redeploy and check again
6. Loop up to 5 times per component until it matches Midday

**Remember:** You're copying EXACT components from Midday. If it doesn't look identical, you did something wrong.

### Why This Matters

The previous attempt failed because:
- Added too many placeholder components at once
- Didn't verify builds incrementally
- TypeScript errors accumulated
- Runtime errors weren't caught early
- Spent hours debugging instead of preventing issues

### Rules

1. **One component at a time** - Don't add multiple components in one commit
2. **Always build locally first** - `npm run build` before pushing
3. **Use Vercel CLI** - `vercel --prod` is faster than waiting for git integration
4. **Check logs immediately** - Don't assume it worked, verify
5. **Browser test every deployment** - Use Playwright to actually load the page
6. **If build fails locally, DO NOT push** - Fix it first
7. **Keep commits small** - Easy to revert if something breaks

### Vercel CLI Commands

```bash
# Deploy to production (use this after each change)
vercel --prod

# Check deployment logs
vercel logs [deployment-url]

# List projects
vercel projects ls

# Remove deployment (if needed)
vercel remove [project-name] --yes
```

### Starting Fresh Checklist

- [ ] Create minimal Next.js app with just landing page
- [ ] Verify it builds: `npm run build`
- [ ] Create GitHub repo and push
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Verify in browser (Playwright)
- [ ] THEN start adding components one by one

### Component Addition Order

Start with the simplest, most independent components first:

1. **Landing page** (public, no auth)
2. **Auth pages** (login/signup)
3. **Basic dashboard shell** (layout only, no data)
4. **UI components** (buttons, cards, icons - no logic)
5. **Dashboard with placeholders** (structure, no real data)
6. **Settings pages** (one at a time)
7. **Data integration** (Appwrite, Plaid)

**After EACH step above, run the full deployment cycle.**
