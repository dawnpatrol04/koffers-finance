# CLAUDE.md - Current Mission

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
