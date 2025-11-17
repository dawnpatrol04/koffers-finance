# Root Cause Analysis: Recurring 401 Authentication Errors

**Date:** January 17, 2025
**Issue:** Client-side Appwrite SDK calls consistently return 401 "Unauthorized" errors
**Frequency:** This is the 5th-6th time this issue has occurred

---

## The Problem

Users can log in successfully, but all client-side data fetching fails with 401 errors:
- Dashboard widgets show "unauthorized" messages
- Transactions page shows "unauthorized" messages
- Chat functionality breaks
- Any direct browser→Appwrite API calls fail

**Symptoms:**
```
Failed to load resource: the server responded with a status of 401
Error fetching transactions: AppwriteException: The current user is not authorized to perform the requested action.
```

---

## Root Cause: Missing Browser Cookie

### The Two-Cookie System

Appwrite + Next.js uses TWO different cookies:

1. **Next.js Cookie** (`appwrite-session`)
   - Domain: `koffers.ai`
   - Set by: Next.js server
   - Used by: Server Components, API Routes
   - ✅ **This cookie WORKS**

2. **Appwrite Cookie** (`a_session_68fdeb62001ad5c77f2f`)
   - Domain: `.api.koffers.ai`
   - Set by: Appwrite when creating session
   - Used by: Client-side Appwrite SDK
   - ❌ **This cookie is MISSING**

### Why the Appwrite Cookie is Missing

Our current login flow:

```
Browser → Next.js Server → Appwrite API
         (Server Action)
```

When `account.createEmailPasswordSession()` is called from the **server** using Admin Client:
1. Appwrite creates the session
2. Appwrite returns session data to the Next.js server
3. Appwrite sets `a_session_*` cookie in the response
4. **THE COOKIE GOES TO THE NEXT.JS SERVER, NOT TO THE BROWSER!**

The browser never sees this cookie, so it can't send it with subsequent requests.

---

## Why This Keeps Happening

Every time we work on authentication/login code, we follow the "best practice" of using server actions. This is correct for security, BUT we're missing the critical step of setting the browser cookie.

**The recurring pattern:**
1. We implement login with server actions ✅
2. We store session in Next.js cookie ✅
3. We forget to set browser cookie ❌
4. Server-side data works ✅
5. Client-side data fails ❌
6. We fix collection permissions (wrong fix!)
7. Problem persists
8. We eventually discover the cookie issue
9. We fix it
10. Later, we refactor auth and break it again

---

## The Correct Solution

### Option 1: Hybrid Approach (RECOMMENDED)

Create session from client, then sync to server:

```typescript
// components/auth/email-signin.tsx
"use client";

import { account } from '@/lib/appwrite-client';  // Client SDK
import { syncSession } from '@/lib/auth-actions';  // Server action

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    // Step 1: Create session from browser (sets browser cookie)
    const session = await account.createEmailPasswordSession(email, password);

    // Step 2: Sync session secret to Next.js cookie
    await syncSession(session.secret);

    //Step 3: Redirect
    router.push('/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```

```typescript
// lib/auth-actions.ts
"use server";

export async function syncSession(sessionSecret: string) {
  await setSession(sessionSecret);
  return { success: true };
}
```

**Benefits:**
- ✅ Browser gets Appwrite cookie (client SDK works)
- ✅ Server gets Next.js cookie (server components work)
- ✅ Both cookies have same session secret
- ✅ Simple to implement

**Drawbacks:**
- Session secret briefly exposed to client code
- Requires one extra server call

### Option 2: Manual Cookie Forwarding (COMPLEX)

Forward the `Set-Cookie` header from Appwrite response to browser:

```typescript
// lib/auth-actions.ts
"use server";

import { cookies } from 'next/headers';

export async function signInWithEmail(email: string, password: string) {
  const { account } = await createAdminClient();

  // Make raw HTTP request to get Set-Cookie header
  const response = await fetch(`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/account/sessions/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!
    },
    body: JSON.stringify({ email, password })
  });

  // Extract Set-Cookie header
  const setCookieHeader = response.headers.get('set-cookie');

  // TODO: Parse and forward to browser (VERY COMPLEX)
  // This approach is not recommended
}
```

**Drawbacks:**
- Very complex cookie parsing
- Hard to maintain
- Error-prone

---

## The Fix We Need to Implement

### File 1: Update `lib/auth-actions.ts`

```typescript
"use server";

import { setSession } from './appwrite-server';

// New action to sync client-created session
export async function syncSession(sessionSecret: string) {
  await setSession(sessionSecret);
  return { success: true };
}
```

### File 2: Update `components/auth/email-signin.tsx`

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite-client";  // ← Client SDK
import { syncSession } from "@/lib/auth-actions";

export function EmailSignIn() {
  // ... existing state ...

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign up flow
        const { account: adminAccount } = await createAdminClient();
        await adminAccount.create(ID.unique(), email, password, name);
      }

      // Sign in flow (works for both new and existing users)
      const session = await account.createEmailPasswordSession(email, password);

      // Sync session to server
      await syncSession(session.secret);

      // Redirect
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Auth error:", err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component ...
}
```

### File 3: Update `lib/auth-actions.ts` (Sign Up)

For sign up, we still need to use Admin Client to create the user, then sign in with client SDK:

```typescript
export async function signUpUser(email: string, password: string, name: string) {
  try {
    const { account } = await createAdminClient();
    await account.create(ID.unique(), email, password, name);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

---

## Testing the Fix

After implementing:

1. **Clear all cookies** in browser DevTools
2. **Log in** with test account
3. **Check cookies** in DevTools → Application → Cookies:
   - Should see `appwrite-session` on `koffers.ai`
   - Should see `a_session_68fdeb62001ad5c77f2f` on `.api.koffers.ai`
4. **Test client-side query**:
   - Open /dashboard/transactions
   - Should see transactions load (not 401)
5. **Test server-side query**:
   - Dashboard widgets should load
6. **Refresh page**:
   - Should stay logged in
   - Data should still load

---

## Prevention Strategy

### 1. Add Cookie Verification to Login Flow

```typescript
// lib/verify-cookies.ts
export async function verifyCookiesSet(): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  const cookies = document.cookie;
  const hasAppwriteCookie = cookies.includes('a_session_');

  if (!hasAppwriteCookie) {
    console.error('[AUTH] Missing Appwrite cookie after login!');
    return false;
  }

  return true;
}
```

Call this after login to catch the issue immediately.

### 2. Add Integration Test

```typescript
// tests/auth.test.ts
describe('Authentication', () => {
  it('should set both cookies after login', async () => {
    await loginWithEmail('test@example.com', 'password');

    const cookies = await page.context().cookies();

    expect(cookies.find(c => c.name === 'appwrite-session')).toBeDefined();
    expect(cookies.find(c => c.name.startsWith('a_session_'))).toBeDefined();
  });

  it('should allow client-side queries after login', async () => {
    await loginWithEmail('test@example.com', 'password');
    await page.goto('/dashboard/transactions');

    await expect(page.getByText('unauthorized')).not.toBeVisible();
  });
});
```

### 3. Document the Pattern

Add to `CLAUDE.md`:

```markdown
## Authentication Pattern (CRITICAL - DO NOT CHANGE)

Login MUST create session from client-side to set browser cookie:

```typescript
// Client component
const session = await account.createEmailPasswordSession(email, password);
await syncSession(session.secret);  // Sync to server
```

DO NOT create session from server action - this breaks client-side SDK!
```

---

## Why Collection Permissions Weren't the Problem

We verified:
- ✅ Collection has `read("users")` permission
- ✅ Document security is disabled
- ✅ Admin can read documents (3,729 total)
- ✅ Permissions configuration is correct

The 401 error wasn't about **authorization** (permissions), it was about **authentication** (missing cookie).

The error message is misleading:
- Appwrite says: "not authorized to perform the requested action"
- Real problem: No session cookie sent, so Appwrite doesn't know WHO the user is

---

## Summary

**Root Cause:** Login creates session server-side, browser never gets Appwrite cookie

**Fix:** Create session client-side, sync secret to server

**Prevention:**
1. Add cookie verification after login
2. Add integration tests
3. Document the pattern in CLAUDE.md

**Why It Keeps Happening:** We keep refactoring auth to use "best practices" (server actions) without understanding the cookie requirements

---

## Action Items

- [ ] Implement hybrid login (client creates session, server syncs)
- [ ] Add cookie verification function
- [ ] Add integration tests
- [ ] Update CLAUDE.md with authentication pattern
- [ ] Test thoroughly before deploying
- [ ] Document in this file for future reference

---

**Last Updated:** January 17, 2025
**Status:** Analysis Complete - Ready for Implementation
