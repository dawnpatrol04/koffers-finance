# Appwrite Authentication Research Notes
**Date:** November 17, 2025
**Purpose:** Understanding the CORRECT way to implement Appwrite authentication with Next.js SSR

---

## KEY FINDINGS

### 1. **There are TWO different authentication patterns for Appwrite:**

#### **Pattern A: Client-Side Rendering (CSR)**
- Use Client SDK directly in browser
- Call `account.createEmailPasswordSession()` from client
- Appwrite automatically sets browser cookies (`a_session_*`)
- Session cookie domain: `.api.domain.com`
- This is for traditional SPAs

#### **Pattern B: Server-Side Rendering (SSR)** ← THIS IS WHAT WE NEED!
- Use Server SDK (Node.js SDK) on the server
- Browser sends credentials to YOUR server endpoint
- Your server calls Appwrite API to create session
- Your server stores session secret in YOUR cookie
- Cookie name: `appwrite-session` (or whatever you want)
- Cookie domain: `yourdomain.com`
- Session cookie is HttpOnly, so client SDK can't use it

---

## 2. **The TWO-COOKIE PROBLEM**

When mixing CSR + SSR patterns (which is what we're doing wrong!), you end up with TWO cookies:

1. **Appwrite's cookie** (`a_session_<PROJECT_ID>`)
   - Set by Appwrite API when client calls `account.createEmailPasswordSession()`
   - Domain: `.api.koffers.ai`
   - Used by Client SDK for browser→Appwrite requests

2. **Our Next.js cookie** (`appwrite-session`)
   - Set by our server action/API route
   - Domain: `koffers.ai`
   - Used by Server SDK for Next.js→Appwrite requests

**THE PROBLEM:** We're trying to use BOTH patterns at once, which creates confusion!

---

## 3. **The CORRECT SSR Pattern (Appwrite Official)**

According to Appwrite docs, for SSR with Next.js:

### Login Flow:
```
1. Browser → POST /api/auth/login with {email, password}
2. Server receives request
3. Server uses Admin Client to call Appwrite.account.createEmailPasswordSession()
4. Appwrite returns session object with .secret property
5. Server sets cookie with session.secret as value
6. Server responds with success
7. Browser now has cookie for future requests
```

### Authenticated Requests:
```
1. Browser → GET /api/data (cookie automatically included)
2. Server reads cookie value (session secret)
3. Server creates session client with client.setSession(sessionSecret)
4. Server makes Appwrite request on behalf of user
5. Server returns data to browser
```

### Key Code Pattern:
```typescript
// Server-side login endpoint
export async function POST(request: Request) {
  const { email, password } = await request.json();

  // Use ADMIN client to create session
  const { account } = await createAdminClient();
  const session = await account.createEmailPasswordSession(email, password);

  // Store session secret in OUR cookie
  cookies().set('appwrite-session', session.secret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: session.expire
  });

  return Response.json({ success: true });
}
```

---

## 4. **What We're Doing WRONG**

Our current implementation (hybrid approach):

```typescript
// Client component
const session = await account.createEmailPasswordSession(email, password); // ← Client SDK!
await fetch('/api/auth/session', {
  body: JSON.stringify({ sessionSecret: session.secret })
}); // ← Then sync to server
```

**Why this is wrong:**
1. We're using Client SDK to create session (sets Appwrite cookie)
2. Then we're ALSO trying to sync to server cookie
3. This creates two cookies with potentially different states
4. Client SDK requests use `a_session_*` cookie
5. Server SDK requests use `appwrite-session` cookie
6. They can get out of sync!

---

## 5. **The CORRECT Implementation for SSR**

### Option 1: Pure SSR (Recommended by Appwrite)
```typescript
// Login: Server-only
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json();
  const { account } = await createAdminClient();
  const session = await account.createEmailPasswordSession(email, password);

  cookies().set('appwrite-session', session.secret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30
  });

  return Response.json({ success: true });
}

// Client-side data fetching: Through server
// app/api/transactions/route.ts
export async function GET() {
  const { databases } = await createSessionClient(); // Uses cookie
  const data = await databases.listDocuments(...);
  return Response.json(data);
}

// Client component just calls API routes
const response = await fetch('/api/transactions');
const data = await response.json();
```

**Benefits:**
- ✅ Single source of truth (one cookie)
- ✅ All Appwrite requests go through your server
- ✅ Session secret never exposed to browser
- ✅ Works with Server Components

**Drawbacks:**
- ❌ Can't use Client SDK features directly
- ❌ Every request goes through your server (extra hop)

### Option 2: Hybrid (Advanced - Not recommended)
If you NEED client SDK features AND server features:
- Use separate authentication mechanisms
- Client SDK for real-time features (subscriptions, storage uploads)
- Server SDK for sensitive operations (payments, admin)
- Accept that you'll have two cookies

---

## 6. **Current Implementation Analysis**

Let's review what we have:

**File: `lib/auth-actions.ts`**
```typescript
// ✅ CORRECT: Sign up creates user server-side
export async function signUpUser(email, password, name) {
  const { account } = await createAdminClient();
  await account.create(ID.unique(), email, password, name);
}

// ❌ WRONG: This tries to sync client-created session
export async function syncSession(sessionSecret: string) {
  await setSession(sessionSecret);
}
```

**File: `components/auth/email-signin.tsx`**
```typescript
// ❌ WRONG: Using client SDK to create session
import { account } from "@/lib/appwrite-client"; // Client SDK!

const session = await account.createEmailPasswordSession(email, password);
await syncSession(session.secret);
```

**File: `app/api/auth/session/route.ts`**
```typescript
// ❌ WRONG PURPOSE: This tries to store client-created session
// Should be a login endpoint that CREATES the session
```

---

## 7. **The Fix We Need**

### Step 1: Remove Client SDK from login flow
Delete the hybrid approach entirely.

### Step 2: Create proper server-side login endpoint
```typescript
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json();

  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    cookies().set('appwrite-session', session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 401 });
  }
}
```

### Step 3: Update client component
```typescript
// components/auth/email-signin.tsx
const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error);
      return;
    }

    // Redirect to dashboard
    router.push('/dashboard');
    router.refresh();
  } catch (error) {
    setError(error.message);
  }
};
```

### Step 4: Update signup flow
```typescript
// app/api/auth/signup/route.ts
export async function POST(request: Request) {
  const { email, password, name } = await request.json();

  try {
    const { account } = await createAdminClient();

    // Create user
    await account.create(ID.unique(), email, password, name);

    // Immediately create session for new user
    const session = await account.createEmailPasswordSession(email, password);

    cookies().set('appwrite-session', session.secret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
```

---

## 8. **Why Our Current Approach Fails**

**Error: "Session secret is required"**
- This happens when `/api/auth/session` receives empty/undefined `sessionSecret`
- Likely because client SDK session creation failed
- Or the session object doesn't have a `.secret` property

**Error: "Creation of a session is prohibited when a session is active"**
- This happens when trying to create a new session while one exists
- The `a_session_*` cookie persists from previous login
- Client SDK sees existing session and rejects new session creation

**Error: 401 Unauthorized from /api/auth/session**
- Middleware was blocking the endpoint
- We fixed this, but the endpoint itself is wrong pattern

---

## 9. **Action Plan**

1. ✅ Delete `app/api/auth/session/route.ts` (wrong pattern)
2. ✅ Create `app/api/auth/login/route.ts` (server-side login)
3. ✅ Create `app/api/auth/signup/route.ts` (server-side signup)
4. ✅ Update `components/auth/email-signin.tsx` to call API routes
5. ✅ Remove Client SDK import from login component
6. ✅ Test login flow end-to-end
7. ✅ Verify single cookie is set
8. ✅ Verify data loads correctly

---

## 10. **References**

- Appwrite SSR Docs: https://appwrite.io/docs/products/auth/server-side-rendering
- Appwrite Next.js Tutorial: https://appwrite.io/docs/tutorials/nextjs-ssr-auth
- Cloudflare Cookie Guide: `/Users/mikeparsons/Desktop/Appwrite-Cloudflare-Cookie-Setup-Guide.md`
- Root Cause Analysis: `docs/ROOT_CAUSE_ANALYSIS_2025-01-17.md`

---

**Key Takeaway:** STOP mixing client and server SDK patterns. Pick ONE and stick with it. For Next.js SSR, use server-only authentication.
