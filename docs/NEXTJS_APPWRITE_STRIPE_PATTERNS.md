# Next.js + Appwrite + Stripe Implementation Patterns

## Research Summary: Stack-Specific Best Practices

Based on research of Next.js 14+ App Router, Appwrite authentication, and Stripe subscriptions implementations.

---

## The Challenge with Our Stack

### What We Have:
- **Next.js 14 App Router** - Server Components, middleware on Edge Runtime
- **Appwrite** - Node.js SDK for database queries (NOT Edge compatible)
- **Stripe** - Subscription webhooks, customer portal

### The Problem:
**Middleware runs on Edge Runtime** which:
- ❌ Cannot use `node-appwrite` SDK
- ❌ Cannot query Appwrite databases directly
- ❌ Cannot use TCP database connections
- ✅ CAN make HTTP API calls
- ✅ CAN read/write cookies
- ✅ CAN redirect requests

---

## Three Approaches for Protected Routes

### Approach 1: Layout-Based Protection ❌ DON'T USE

```typescript
// app/dashboard/layout.tsx
export default async function DashboardLayout({ children }) {
  const user = await getUser(); // Check auth in layout
  if (!user) redirect('/login');
  return <div>{children}</div>;
}
```

**Why This Fails:**
- Layouts don't guarantee execution before pages
- RSC payloads can be requested directly, bypassing layouts
- **Security vulnerability**: Content leaks before auth check

Source: Eric Burel's research on Next.js App Router security

---

### Approach 2: Server Component Guards ✅ WORKS (but suboptimal)

```typescript
// app/dashboard/page.tsx
import { checkSubscriptionAccess } from '@/lib/subscription-check';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { hasAccess, reason } = await checkSubscriptionAccess();

  if (!hasAccess) {
    redirect(`/billing?reason=${reason}`);
  }

  return <DashboardContent />;
}
```

**How It Works:**
- Check runs server-side BEFORE rendering
- Uses Node.js Appwrite SDK (works in Server Components)
- Queries database on every request
- Redirects before any content is sent

**Pros:**
- ✅ Secure - no content leaks
- ✅ Works with Appwrite SDK
- ✅ Can query database normally
- ✅ Easy to implement per-page

**Cons:**
- ⚠️ **Forces dynamic rendering** (no static optimization)
- ⚠️ Database query on every page load
- ⚠️ Must add to each protected page
- ⚠️ Slightly slower than middleware

**When to Use:**
- Content is highly sensitive (paid features)
- Need granular per-page control
- Database queries are required for access decision

Source: Appwrite threads + Next.js Server Components docs

---

### Approach 3: Middleware + Session Token ✅ OPTIMAL (but requires changes)

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('appwrite-session');

  // Decrypt session or validate token
  const session = await decryptSession(sessionCookie);

  if (!session.isPaid) {
    return NextResponse.redirect(new URL('/billing', request.url));
  }

  return NextResponse.next();
}
```

**How It Works:**
- Store subscription status in encrypted session cookie
- Middleware reads cookie (no database query)
- Blocks request before reaching Next.js app
- Content remains statically rendered

**Pros:**
- ✅ **Fastest** - no database queries
- ✅ Static rendering possible
- ✅ Centralized auth check
- ✅ Blocks before RSC payload generation

**Cons:**
- ❌ **Requires Appwrite session structure changes**
- ❌ Must sync subscription status to session cookie
- ❌ Cookie size limitations
- ❌ Stale data risk (subscription changed, cookie not updated)

**When to Use:**
- Performance is critical
- Subscription status changes infrequently
- Willing to implement session sync logic

Source: Eric Burel's static paid content guide

---

## Our Current Limitation: Appwrite Sessions

### Appwrite Session Structure

Appwrite creates session cookies like:
```
appwrite-session = encrypted_session_token
```

**What's IN the session:**
- User ID
- Session ID
- Expiration
- User metadata (limited)

**What's NOT in the session:**
- Subscription status
- Payment tier
- Feature flags
- Custom attributes

### The Challenge

To use Approach 3 (middleware), we'd need to:

1. **Extend Appwrite sessions** with subscription data
   - Store `isPaid`, `tier`, `expiresAt` in session
   - Encrypt and sign the cookie
   - Keep it under 4KB limit

2. **Sync on every subscription change**
   - Stripe webhook → update Appwrite user prefs
   - Appwrite user prefs → regenerate session cookie
   - Complex state management

3. **Handle stale data**
   - What if webhook is delayed?
   - What if user has multiple sessions?
   - Cache invalidation strategy

**This is complex and error-prone.**

---

## Recommended Hybrid Approach for Our Stack

### Strategy: Server Components + Smart Caching

```typescript
// lib/subscription-check.ts (enhanced)
import { unstable_cache } from 'next/cache';

export const checkSubscriptionAccess = unstable_cache(
  async function (userId: string) {
    const { databases } = await createAdminClient();

    const subscriptions = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      [Query.equal('userId', userId)]
    );

    // ... validation logic
    return { hasAccess, reason, subscription };
  },
  ['subscription-check'], // cache key
  {
    revalidate: 60, // 60 seconds
    tags: ['subscriptions']
  }
);

// app/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const { hasAccess } = await checkSubscriptionAccess(user.$id);

  if (!hasAccess) redirect('/billing');

  return <DashboardContent />;
}
```

**How This Works:**

1. **First request**: Query database, cache result for 60 seconds
2. **Subsequent requests** (within 60s): Use cached result
3. **Webhook receives update**: Call `revalidateTag('subscriptions')`
4. **Next request**: Fresh database query

**Benefits:**
- ✅ Secure (server-side validation)
- ✅ Fast (most requests use cache)
- ✅ Works with Appwrite SDK
- ✅ No session structure changes needed
- ✅ Auto-refresh on webhook events

**Trade-offs:**
- ⚠️ Up to 60-second delay for subscription changes
- ⚠️ Still requires per-page guards
- ⚠️ Shared cache across users (safe for subscription checks)

---

## Implementation Pattern Comparison

| Aspect | Layout Auth | Server Component | Middleware + Session | Hybrid (Recommended) |
|--------|-------------|------------------|---------------------|---------------------|
| Security | ❌ Vulnerable | ✅ Secure | ✅ Secure | ✅ Secure |
| Performance | ⚡ Fast | 🐌 Slow | ⚡⚡ Fastest | ⚡ Fast |
| Database Queries | Many | Every request | None | 1 per minute |
| Works with Appwrite | ✅ Yes | ✅ Yes | ❌ No (requires changes) | ✅ Yes |
| Complexity | Simple | Simple | Very Complex | Moderate |
| Static Rendering | ✅ Possible | ❌ No | ✅ Yes | ❌ No |
| Maintenance | Easy | Easy | Hard | Moderate |

---

## Stripe Webhook Integration

### What Webhooks Do

When subscription changes in Stripe:
```
User cancels → Stripe webhook → Update Appwrite → Revalidate cache
```

### Implementation

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(req: NextRequest) {
  const event = stripe.webhooks.constructEvent(...);

  switch (event.type) {
    case 'customer.subscription.updated':
      await updateSubscriptionInAppwrite(event.data.object);

      // Invalidate Next.js cache
      revalidateTag('subscriptions');
      break;

    case 'customer.subscription.deleted':
      await updateSubscriptionInAppwrite(event.data.object);
      revalidateTag('subscriptions');
      break;
  }
}
```

**Key Points:**
- Webhook updates Appwrite database
- Calls `revalidateTag()` to bust cache
- Next request gets fresh data

---

## Appwrite Session Management Pattern

### Current Auth Flow

```typescript
// lib/appwrite-server.ts (what we already have)
export async function getCurrentUser() {
  const sessionCookie = cookies().get('appwrite-session');

  if (!sessionCookie) return null;

  const { account } = await createSessionClient(sessionCookie);
  return await account.get();
}
```

**This works because:**
- Server Components can read cookies
- `account.get()` uses the session cookie
- Returns user object with ID, email, etc.

### Why We Can't Use Middleware

```typescript
// middleware.ts (Edge Runtime)
export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('appwrite-session');

  // ❌ This doesn't work - no Appwrite SDK on Edge
  const { account } = await createSessionClient(sessionCookie);
  const user = await account.get(); // FAILS

  // ❌ This also doesn't work - no database on Edge
  const { databases } = await createAdminClient();
  const sub = await databases.listDocuments(...); // FAILS
}
```

**Why it fails:**
- Appwrite SDK uses Node.js APIs (Buffer, crypto, etc.)
- Edge Runtime is V8 isolate (like browser JavaScript)
- No file system, no TCP sockets

---

## Final Recommendation for Koffers

### Use: Server Component Guards + Caching

**For each protected page:**

```typescript
// app/dashboard/transactions/page.tsx
import { checkSubscriptionAccess } from '@/lib/subscription-check';
import { redirect } from 'next/navigation';

export default async function TransactionsPage() {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  const { hasAccess, reason } = await checkSubscriptionAccess(user.$id);

  if (!hasAccess) {
    redirect(`/billing?reason=${reason}&redirect=/dashboard/transactions`);
  }

  return <TransactionsContent />;
}
```

**Cache the subscription check:**

```typescript
// lib/subscription-check.ts
import { unstable_cache } from 'next/cache';
import { revalidateTag } from 'next/cache';

export const checkSubscriptionAccess = unstable_cache(
  async (userId: string) => {
    const { databases } = await createAdminClient();

    const subs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      [Query.equal('userId', userId)]
    );

    if (subs.documents.length === 0) {
      return { hasAccess: false, reason: 'no_subscription' };
    }

    const sub = subs.documents[0];

    // Check status
    if (!['active', 'trialing'].includes(sub.status)) {
      return { hasAccess: false, reason: `subscription_${sub.status}` };
    }

    // Check expiration
    if (new Date(sub.currentPeriodEnd) < new Date()) {
      return { hasAccess: false, reason: 'subscription_expired' };
    }

    return { hasAccess: true, subscription: sub };
  },
  ['subscription-check'],
  {
    revalidate: 60, // Cache for 1 minute
    tags: ['subscriptions']
  }
);

// Call this from Stripe webhook:
export async function invalidateSubscriptionCache() {
  revalidateTag('subscriptions');
}
```

**In Stripe webhook:**

```typescript
// app/api/webhooks/stripe/route.ts
case 'customer.subscription.updated':
  await handleSubscriptionUpdate(subscription);

  // Bust the cache so next check is fresh
  invalidateSubscriptionCache();
  break;
```

---

## Why This Works for Koffers

1. **Secure**: Server-side validation, no content leaks
2. **Fast enough**: 1-minute cache, fresh on webhook
3. **Simple**: No session token changes needed
4. **Compatible**: Works perfectly with Appwrite SDK
5. **Maintainable**: Clear separation of concerns

**Trade-off**: Not as fast as pure middleware, but realistic given our stack constraints.

---

## Alternative: Future Optimization

If performance becomes critical:

### Option: Appwrite Functions + Edge Cache

1. Create Appwrite Function that checks subscription
2. Function returns simple JSON: `{ isPaid: true }`
3. Call function from middleware via HTTPS
4. Cache response in Edge KV store

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('appwrite-session');

  // Call Appwrite Function via HTTPS (works on Edge)
  const response = await fetch(
    `${APPWRITE_ENDPOINT}/functions/${FUNCTION_ID}/executions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'Cookie': `a_session_${PROJECT_ID}=${sessionCookie.value}`
      }
    }
  );

  const { isPaid } = await response.json();

  if (!isPaid) {
    return NextResponse.redirect(new URL('/billing', request.url));
  }
}
```

**Pros:**
- ✅ Runs in middleware
- ✅ Faster than Server Component
- ✅ Works with Edge Runtime

**Cons:**
- ❌ Requires Appwrite Function deployment
- ❌ More complex architecture
- ❌ Additional latency (HTTPS call)
- ❌ Still slower than session cookie approach

**Verdict**: Not worth the complexity for Koffers right now.

---

## Summary: Best Path Forward

1. ✅ **Use Server Component guards** on each protected page
2. ✅ **Cache subscription checks** for 60 seconds
3. ✅ **Revalidate on Stripe webhooks**
4. ✅ **Keep existing Appwrite session structure**
5. ❌ **Don't try to use middleware** for subscription checks

This gives us secure, reasonably fast protection without fighting the stack.

