# CLAUDE.md - Current Mission

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

### Settings Pages - DONE
- [x] Settings layout with tab navigation
- [x] General settings (profile picture, full name, email)
- [x] Accounts settings (bank connections placeholder)
- [x] Notifications settings (4 notification toggles with switches)
- [x] Billing settings page (copied, not yet tested)
- [x] Members settings page (copied, not yet tested)
- [x] Developer settings page (copied, not yet tested)

### Infrastructure - DONE
- [x] React Query / TanStack Query setup with QueryClientProvider
- [x] tRPC client placeholders (with TODO comments for Appwrite integration)
- [x] use-user hook adapter for Appwrite UserContext
- [x] Placeholder header components (connection-status, notification-center, trial, etc.)

## CURRENT STATUS

**All core dashboard components are successfully copied and rendering with EXACT Midday styling:**

1. **Dashboard** (`/dashboard`) - Fully functional with sidebar, header, overview cards
2. **Settings/General** (`/dashboard/settings`) - Profile picture, full name, email fields
3. **Settings/Accounts** (`/dashboard/settings/accounts`) - Connected accounts placeholder
4. **Settings/Notifications** (`/dashboard/settings/notifications`) - 4 notification toggles

**Verified Working Features:**
- Hover-triggered sidebar expansion with smooth animations
- Dropdown menu items with chevron rotation
- Settings tab navigation
- Form inputs and switches
- User avatar display

## NEXT STEPS

The following components are referenced but not yet implemented (will return placeholders for now):

### Settings Page Dependencies
- Company-specific components (company-logo, company-name, company-email, company-country, delete-team)
- Base currency selector
- Team members management
- API keys and OAuth applications tables
- Billing/subscription components

### tRPC to Appwrite Migration
- Replace tRPC placeholders in `/trpc/client.ts` with actual Appwrite SDK calls
- Implement user update mutations
- Implement team list queries
- Add proper error handling

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
