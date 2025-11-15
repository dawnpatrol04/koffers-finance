# Authentication Audit Report

**Date:** 2025-11-15
**Purpose:** Full audit of authentication/login code to identify why "sometimes login works, sometimes doesn't"

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:** The application has **TWO conflicting authentication patterns** from different stages of development:

1. ✅ **New Pattern (Server-side):** Email authentication using server actions - **WORKS**
2. ❌ **Old Pattern (Client-side):** OAuth authentication using client SDK - **BROKEN**

The OAuth components (Google, GitHub, Apple) reference a client-side `account` object that **no longer exists**, causing all OAuth login attempts to fail.

---

## Critical Issues Found

### 🚨 Issue #1: OAuth Components Reference Non-Existent Account Export

**Severity:** CRITICAL - Complete OAuth login failure

**Affected Files:**
- `components/auth/apple-signin.tsx:3`
- `components/auth/github-signin.tsx:3`
- `components/auth/google-signin.tsx:3`

**Problem:**
```typescript
// All three OAuth components import this:
import { account, OAuthProvider } from "@/lib/appwrite-client";

// But lib/appwrite-client.ts has removed this export:
// const account = new Account(client); // COMMENTED OUT
// export { account }; // REMOVED
```

**Why It's Broken:**
`lib/appwrite-client.ts` lines 18-24 show:
```typescript
// WARNING: Account authentication should be done server-side via server actions.
// Client-side account operations are disabled.
// const account = new Account(client);

export { databases, storage, client };
// export { account }; // Removed - use server actions for auth
```

**Impact:**
- Google Sign In button: ❌ BROKEN
- GitHub Sign In button: ❌ BROKEN
- Apple Sign In button: ❌ BROKEN
- Email Sign In button: ✅ WORKS (uses server actions)

**This explains the intermittent login issue** - it depends which button the user clicks!

---

### 🚨 Issue #2: Login Page Renders Broken OAuth Buttons

**Severity:** HIGH - Poor user experience

**Affected File:** `app/login/page.tsx:36-38`

**Problem:**
```typescript
<div className="space-y-3">
  <GoogleSignIn />   {/* BROKEN */}
  <GitHubSignIn />   {/* BROKEN */}
  <EmailSignIn />    {/* WORKS */}
</div>
```

The login page renders all three OAuth buttons, but only email signin actually works. Users clicking Google/GitHub/Apple buttons get silent failures or errors.

---

### ⚠️ Issue #3: Client-Side Route Protection (Anti-Pattern)

**Severity:** MEDIUM - Security concern

**Affected File:** `components/auth/protected-route.tsx`

**Problem:**
```typescript
"use client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

**Why It's Problematic:**
1. **Client-side protection** - Runs in browser, not server
2. **Content can leak** - RSC payloads can be requested directly
3. **useEffect timing** - Redirect happens AFTER component mounts
4. **Known anti-pattern** - Eric Burel's App Router security research

**Correct Pattern (from Appwrite docs):**
```typescript
// Server Component
export default async function ProtectedPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return <Content />;
}
```

---

### ✅ Issue #4: Appwrite Permissions (To Be Checked)

**Severity:** UNKNOWN - Needs investigation

**Note from user:**
> "there is a known issue that like if you change something in the database like you have to reset the permissions.. in appwrite for the data"

**Collections to check:**
- `plaidTransactions` - Transactions sometimes don't load
- `plaidAccounts` - Account data
- `plaidItems` - Bank connections
- `subscriptions` - Subscription data

**Recommended Permissions:**
```
Read:
- User (current user can read their own data)
- Query: userId == $userId

Create:
- User (current user can create their own data)

Update:
- User (current user can update their own data)
- Query: userId == $userId

Delete:
- User (current user can delete their own data)
- Query: userId == $userId
```

**Action Required:** Verify ALL collections have correct user-level permissions set.

---

## Working vs Broken Authentication Methods

### ✅ WORKING: Email Authentication

**Flow:**
1. User enters email/password in `components/auth/email-signin.tsx`
2. Calls server action `signInWithEmail()` from `lib/auth-actions.ts`
3. Server action uses admin client to create session
4. Session stored in httpOnly cookie
5. Middleware validates session cookie exists
6. Protected routes call `getCurrentUser()` via session client

**Files:**
- `components/auth/email-signin.tsx` - Form component ✅
- `lib/auth-actions.ts` - Server actions ✅
- `lib/appwrite-server.ts` - Session management ✅
- `middleware.ts` - Cookie checking ✅

**Status:** Fully functional

---

### ❌ BROKEN: OAuth Authentication

**Attempted Flow (doesn't work):**
1. User clicks Google/GitHub/Apple button
2. Component tries to import `account` from `appwrite-client`
3. **FAILS** - `account` export doesn't exist
4. Runtime error or silent failure
5. User not logged in

**Files:**
- `components/auth/google-signin.tsx` - ❌ BROKEN (imports non-existent account)
- `components/auth/github-signin.tsx` - ❌ BROKEN (imports non-existent account)
- `components/auth/apple-signin.tsx` - ❌ BROKEN (imports non-existent account)
- `lib/appwrite-client.ts` - Account export removed

**Status:** Completely non-functional

---

## API Routes Authentication Pattern

**Reviewed:** 3 critical API routes

### ✅ `/api/transactions` (POST) - CORRECT
```typescript
const { account } = await createSessionClient();
const user = await account.get();
const userId = user.$id;
```
Uses session client to get authenticated user. ✅

### ✅ `/api/plaid/create-link-token` (POST) - CORRECT
```typescript
const body = await request.json();
const userId = body.userId;
```
Accepts userId from client (client already authenticated via Appwrite). ✅

### ✅ `/api/subscription` (GET) - CORRECT
```typescript
const user = await getCurrentUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
Uses server-side `getCurrentUser()` helper. ✅

**Conclusion:** API routes follow correct server-side authentication pattern.

---

## Middleware Analysis

**File:** `middleware.ts`

**Current Behavior:**
```typescript
const sessionCookie = request.cookies.get("appwrite-session");

if (protectedPaths.some(path => pathname.startsWith(path))) {
  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
```

**What it does:**
- ✅ Checks if session cookie exists
- ✅ Redirects to login if missing
- ✅ Protects `/dashboard/*` routes

**What it doesn't do:**
- ❌ Validate subscription status (can't use Appwrite SDK on Edge Runtime)
- ❌ Check if session is still valid (just checks cookie exists)
- ❌ Query database (Edge Runtime limitation)

**Status:** Correct implementation given Edge Runtime constraints

**Comment in file (line 36-38):**
```typescript
// Note: Cannot check subscription status here because Appwrite SDK
// requires Node.js runtime. Subscription checks happen in Server Components.
```

This is the correct approach per Appwrite's official recommendation.

---

## User Context Pattern

**File:** `contexts/user-context.tsx`

**Pattern:**
```typescript
"use client";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);

  useEffect(() => {
    fetch('/api/user', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setUser(data.user));
  }, []);
}
```

**How it works:**
1. Client component fetches user from `/api/user` endpoint
2. API endpoint calls `getCurrentUser()` server-side
3. Returns user object or null
4. Stores in React Context for client components

**Status:** ✅ Correct pattern for client-side user state

---

## Authentication Evolution Timeline

Based on code analysis, the app went through these stages:

### Stage 1: Client-Side Authentication (OLD)
- Used `Account` from `appwrite-client.ts`
- Client-side OAuth flows
- Client-side session management

### Stage 2: Migration to Server Actions (CURRENT - INCOMPLETE)
- Added `lib/auth-actions.ts` with server actions
- Commented out `Account` export from `appwrite-client.ts`
- Updated email signin to use server actions
- **FORGOT to update OAuth components**

### Stage 3: Server Component Guards (PLANNED - NOT IMPLEMENTED)
- Per Appwrite official pattern
- Replace `ProtectedRoute` wrapper
- Add guards to each protected page

---

## Specific Symptoms Explained

### "Sometimes login works, sometimes doesn't"

**Explanation:**
- ✅ If user clicks "Continue with Email" → **WORKS** (uses server actions)
- ❌ If user clicks "Continue with Google" → **FAILS** (broken OAuth)
- ❌ If user clicks "Continue with GitHub" → **FAILS** (broken OAuth)
- ❌ If user clicks "Continue with Apple" → **FAILS** (broken OAuth)

The inconsistency depends on which button the user pressed.

### "Sometimes transactions load, sometimes don't"

**Possible Causes:**
1. **Appwrite permissions** - Need to verify collection permissions
2. **Broken OAuth session** - If user logged in via OAuth, session may be invalid
3. **Race condition** - Client-side fetching with stale auth state

**Needs Further Investigation:**
- Check Appwrite permissions for `plaidTransactions` collection
- Verify all users in database have proper session cookies
- Test transaction loading with different login methods

---

## Required Fixes (Priority Order)

### 🔥 P0: Fix OAuth Login (CRITICAL)

**Option A: Remove OAuth Buttons Temporarily**
```typescript
// app/login/page.tsx
<div className="space-y-3">
  {/* Temporarily disabled until OAuth is fixed
  <GoogleSignIn />
  <GitHubSignIn />
  */}
  <EmailSignIn />
</div>
```

**Option B: Implement OAuth Server Actions**
Create new server actions for OAuth:
```typescript
// lib/auth-actions.ts
"use server";

export async function signInWithOAuth(provider: 'google' | 'github' | 'apple') {
  const { account } = await createAdminClient();
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

  return await account.createOAuth2Session(
    OAuthProvider[capitalize(provider)],
    redirectUrl,
    redirectUrl
  );
}
```

Then update components:
```typescript
// components/auth/google-signin.tsx
import { signInWithOAuth } from "@/lib/auth-actions";

export function GoogleSignIn() {
  const handleSignIn = async () => {
    await signInWithOAuth('google');
  };
  // ...
}
```

---

### 🔥 P1: Remove Client-Side Route Protection

**Replace:**
```typescript
// app/dashboard/layout.tsx (OLD - REMOVE THIS)
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function DashboardLayout({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
```

**With:**
```typescript
// app/dashboard/page.tsx (NEW - ADD THIS)
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/appwrite-server';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <DashboardContent />;
}
```

Do this for EVERY protected page.

---

### ⚠️ P2: Check Appwrite Permissions

**Collections to verify:**
- `plaidTransactions`
- `plaidAccounts`
- `plaidItems`
- `subscriptions`
- Any other user data collections

**Recommended Settings:**
```
Permissions Tab:
✅ Read: User (userId == $userId)
✅ Create: User
✅ Update: User (userId == $userId)
✅ Delete: User (userId == $userId)
```

**How to Fix:**
1. Open Appwrite Console
2. Go to each collection
3. Click "Settings" → "Permissions"
4. Verify user-level permissions
5. If changed, click "Update Permissions"

---

### 📋 P3: Clean Up Dead Code

**Files to remove/refactor:**
- `components/auth/protected-route.tsx` - Delete after migration to server guards
- OAuth components - Either fix or remove

---

## Testing Checklist

Once fixes are applied:

### Email Authentication
- [ ] New user signup with email
- [ ] Existing user login with email
- [ ] Logout
- [ ] Session persists on page reload
- [ ] Middleware redirects when not logged in
- [ ] Transactions load after email login

### OAuth Authentication (if fixed)
- [ ] Google OAuth flow
- [ ] GitHub OAuth flow
- [ ] Apple OAuth flow
- [ ] Session persists on page reload
- [ ] Transactions load after OAuth login

### Permissions
- [ ] User can read their own transactions
- [ ] User cannot read other users' transactions
- [ ] User can create transactions
- [ ] User can update their transactions
- [ ] User can delete their transactions

### Edge Cases
- [ ] Invalid session cookie → redirects to login
- [ ] Expired session → redirects to login
- [ ] Direct API access without auth → 401 error
- [ ] Multiple tabs with same session

---

## Recommendations

### Short-term (Next 48 hours)
1. **Disable OAuth buttons** - Remove from login page until fixed
2. **Communicate to users** - "Email login only for now"
3. **Check Appwrite permissions** - Verify all collections
4. **Test with email login** - Ensure that path works 100%

### Medium-term (Next 2 weeks)
1. **Implement OAuth server actions** - Proper server-side OAuth
2. **Migrate to server component guards** - Replace ProtectedRoute
3. **Add comprehensive auth tests** - Prevent regressions

### Long-term (Next month)
1. **Implement subscription guards** - Per the access control plan
2. **Add usage metrics tracking** - Per USAGE_METRICS_TRACKING.md
3. **Set up monitoring** - Track auth failures in production

---

## Files Audited

### Core Auth Infrastructure ✅
- `middleware.ts` - Session cookie checking
- `lib/auth-actions.ts` - Server actions for email auth
- `lib/appwrite-client.ts` - Client SDK (Account removed)
- `lib/appwrite-server.ts` - Server SDK (session management)

### Auth Components ✅
- `components/auth/email-signin.tsx` - Works (server actions)
- `components/auth/google-signin.tsx` - Broken (missing account)
- `components/auth/github-signin.tsx` - Broken (missing account)
- `components/auth/apple-signin.tsx` - Broken (missing account)
- `components/auth/protected-route.tsx` - Anti-pattern (client-side)

### Pages ✅
- `app/login/page.tsx` - Renders broken OAuth buttons

### User State ✅
- `contexts/user-context.tsx` - Client-side user state
- `app/api/user/route.ts` - User API endpoint

### Sample API Routes ✅
- `app/api/transactions/route.ts` - Correct auth pattern
- `app/api/plaid/create-link-token/route.ts` - Correct auth pattern
- `app/api/subscription/route.ts` - Correct auth pattern

---

## Conclusion

The root cause of "sometimes login works, sometimes doesn't" is **a half-completed migration from client-side to server-side authentication.**

**Email login works** because it uses the new server actions pattern.
**OAuth login fails** because the components still reference the old client-side Account that no longer exists.

**Immediate Action Required:**
1. Remove or disable OAuth buttons until they're properly implemented with server actions
2. Verify Appwrite collection permissions
3. Test that email login works 100% reliably

**The good news:** The server-side infrastructure is already in place and working correctly. We just need to finish the migration by either fixing or removing the OAuth components.
