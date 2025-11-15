# Appwrite's Official Recommendation for Next.js Authentication

## Source
Official Appwrite documentation: https://appwrite.io/docs/tutorials/nextjs-ssr-auth/

## What Appwrite Recommends

### ✅ Use Server Components for Route Protection

Appwrite's official tutorial shows:

```javascript
// lib/server/appwrite.js
export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    return await account.get();
  } catch (error) {
    return null;
  }
}

// app/page.tsx (Server Component)
export default async function Home() {
  const user = await getLoggedInUser();

  if (!user) redirect("/signup");
  redirect("/account");
}
```

### Key Points from Official Docs

1. **Server-Side Validation**: Use server components, not client-side checks
2. **Session Client**: Create a new client instance per request using `createSessionClient()`
3. **Redirect Pattern**: Use Next.js `redirect()` based on authentication status
4. **No Middleware**: Official tutorial does NOT use middleware for auth

### Critical Security Note

From Appwrite docs:
> "It's important to never share a Client instance between two requests. Doing so could create security vulnerabilities."

Each request must create a fresh Appwrite client instance.

## Why Not Middleware?

From community threads:
- Next.js middleware runs on **Edge Runtime**
- Appwrite Node SDK requires **Node.js runtime**
- These are incompatible
- Appwrite moved authentication to **Server Actions** marked with `"use server"`

## The Recommended Pattern

```typescript
// lib/appwrite-server.ts
"use server";

import { Client, Account } from "node-appwrite";
import { cookies } from "next/headers";

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT);

  const session = cookies().get("appwrite-session");

  if (!session) {
    throw new Error("No session");
  }

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    }
  };
}

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    return await account.get();
  } catch (error) {
    return null;
  }
}

// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getLoggedInUser } from '@/lib/appwrite-server';

export default async function DashboardPage() {
  const user = await getLoggedInUser();

  if (!user) redirect('/login');

  return <DashboardContent />;
}
```

## For Subscription Checks

Following the same pattern:

```typescript
// lib/subscription-check.ts
"use server";

export async function checkSubscriptionAccess() {
  const user = await getLoggedInUser();

  if (!user) {
    return { hasAccess: false, reason: 'not_authenticated' };
  }

  const { databases } = await createAdminClient();

  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', user.$id)]
  );

  // ... check subscription status

  return { hasAccess, reason, subscription };
}

// app/dashboard/transactions/page.tsx
export default async function TransactionsPage() {
  const { hasAccess, reason } = await checkSubscriptionAccess();

  if (!hasAccess) {
    redirect(`/billing?reason=${reason}`);
  }

  return <TransactionsContent />;
}
```

## Summary

**Appwrite officially recommends:**
- ✅ Server Components with `redirect()`
- ✅ Server Actions (`"use server"`)
- ✅ Fresh client instance per request
- ❌ NOT middleware (Edge Runtime incompatible)
- ❌ NOT client-side route protection

**This matches what we already discovered through research.**

The pattern we outlined (Server Component guards + caching) is **exactly what Appwrite recommends**, just enhanced with caching for performance.

