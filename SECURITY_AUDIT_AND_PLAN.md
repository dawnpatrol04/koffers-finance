# Security Audit & Remediation Plan

**Date:** November 11, 2025
**Issue:** Multiple API endpoints accept `userId` from URL parameters without authentication
**Risk Level:** 🚨 CRITICAL - Anyone with a userId can access/modify that user's data

---

## Key Findings from Appwrite Research

### Appwrite Security Model (Official Best Practices)

1. **Client SDK (Browser)**
   - Uses user's session cookie automatically
   - All requests authenticated as logged-in user
   - Appwrite enforces document-level permissions server-side
   - Users can ONLY see documents they have permission to access

2. **Server SDK (API Key)**
   - Bypasses ALL permission checks
   - Should ONLY be used for:
     - Admin operations
     - Operations requiring secrets (Plaid API, etc.)
     - Background jobs
   - **NEVER share client instance between requests** (security vulnerability)

3. **Document Permissions** (Enable in Collection Settings)
   ```typescript
   // When creating documents, set explicit permissions:
   Permission.read(Role.user(userId))
   Permission.write(Role.user(userId))
   ```

4. **Session Authentication in Next.js Server Actions**
   - Store session secret in httpOnly, secure, sameSite cookies
   - Create session client from cookie for authenticated requests
   - Never trust userId from URL params!

---

## Current Endpoint Audit

### Category 1: ❌ REMOVE - Replace with Direct Client SDK

These endpoints simply query Appwrite and return data. The frontend can call Appwrite directly with automatic session authentication.

| Endpoint | Current Approach | Secure Approach |
|----------|-----------------|-----------------|
| `/api/plaid/transactions` | Server SDK + URL userId | Client SDK (auto-filtered by user session) |
| `/api/plaid/accounts` | Server SDK + URL userId | Client SDK (auto-filtered by user session) |
| `/api/files/route.ts` (GET) | Server SDK + URL userId | Client SDK (auto-filtered by user session) |
| `/api/dashboard/summary` | Server SDK + URL userId | Client SDK queries + frontend aggregation |
| `/api/transactions` | Server SDK + URL userId | Client SDK (auto-filtered by user session) |

**Action:** Remove these endpoints. Update frontend to use `@/lib/appwrite-client.ts` directly.

---

### Category 2: 🔧 FIX - Add Session Authentication

These endpoints need server-side logic but currently lack auth. Must validate session before using server SDK.

| Endpoint | Issue | Fix Required |
|----------|-------|--------------|
| `/api/files/upload` | Trusts userId from URL | Validate session → extract userId from session |
| `/api/files/[fileId]` (DELETE) | Trusts userId from URL | Validate session → verify file ownership |
| `/api/files/process-receipt` | Trusts userId from URL | Validate session → extract userId |
| `/api/keys/route.ts` | Trusts userId from URL | Validate session → extract userId |
| `/api/keys/[keyId]` | Trusts userId from URL | Validate session → verify key ownership |

**Action:** Create session validation helper. Add to each endpoint.

---

### Category 3: ✅ KEEP - Already Secure or Special Purpose

| Endpoint | Why It's OK | Notes |
|----------|-------------|-------|
| `/api/mcp/route.ts` | Uses API key authentication | Already validates `kf_live_*` keys |
| `/api/mcp/sse/route.ts` | SSE for MCP | Same API key auth |
| `/api/plaid/create-link-token` | Needs server secrets | Add session validation |
| `/api/plaid/exchange-token` | Needs server secrets | Add session validation |
| `/api/plaid/fetch-data` | Plaid API + background sync | Add session validation |
| `/api/plaid/remove-item` | Plaid API | Add session validation |
| `/api/plaid/sync-status` | Query sync jobs | Can use client SDK instead |
| `/api/webhook/plaid` | Webhook from Plaid | Validate webhook signature |
| `/api/ai/categorize-transaction` | Uses Claude API key | Add session validation |
| `/api/ai/health` | Public health check | OK as-is |
| `/api/chat` | Uses Claude API key | Add session validation |
| `/api/admin/*` | Admin operations | Add admin-only auth check |

---

## Remediation Plan

### Phase 1: Create Session Validation Helper ✅ PRIORITY 1

Create `/lib/auth-helpers.ts`:

```typescript
import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';

/**
 * Validate session and return authenticated user
 * Use in API routes that need authentication
 */
export async function validateSession() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('appwrite-session');

  if (!sessionCookie) {
    throw new Error('Unauthorized - No session');
  }

  // Create session client
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setSession(sessionCookie.value);

  const account = new Account(client);

  try {
    const user = await account.get();
    return { user, userId: user.$id, client };
  } catch (error) {
    throw new Error('Unauthorized - Invalid session');
  }
}

/**
 * Check if user is admin
 */
export async function requireAdmin() {
  const { user } = await validateSession();

  // Check admin status (implement based on your admin logic)
  // Could be: labels, team membership, prefs, etc.
  const isAdmin = user.labels?.includes('admin') || false;

  if (!isAdmin) {
    throw new Error('Forbidden - Admin access required');
  }

  return { user, userId: user.$id };
}
```

### Phase 2: Fix File Upload Endpoint ✅ PRIORITY 1

Update `/api/files/upload/route.ts`:

```typescript
import { validateSession } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    // Validate session and get userId
    const { userId } = await validateSession();

    // Remove userId from searchParams check
    // const userId = searchParams.get('userId'); ❌ DELETE THIS

    const formData = await request.formData();
    // ... rest of upload logic using validated userId
```

### Phase 3: Remove Unnecessary Endpoints ⚠️ PRIORITY 2

**Before removing, update frontend to use client SDK:**

1. Update components to import from `@/lib/appwrite-client.ts`
2. Replace API fetch calls with direct Appwrite calls
3. Test thoroughly
4. Then delete the API route files

Example frontend change:
```typescript
// ❌ OLD - Insecure API call
const response = await fetch(`/api/plaid/transactions?userId=${userId}`);

// ✅ NEW - Direct client SDK (auto-authenticated)
import { databases } from '@/lib/appwrite-client';
const transactions = await databases.listDocuments(
  DATABASE_ID,
  COLLECTIONS.PLAID_TRANSACTIONS,
  [Query.limit(100), Query.orderDesc('$createdAt')]
);
// Appwrite automatically filters to current user's data!
```

### Phase 4: Add Session Validation to Remaining Endpoints ⚠️ PRIORITY 2

For each endpoint in Category 2 and appropriate ones in Category 3:

1. Import `validateSession`
2. Call at start of handler
3. Use returned `userId` instead of URL param
4. Handle auth errors properly

### Phase 5: Set Appwrite Collection Permissions 🔒 PRIORITY 1

**In Appwrite Dashboard**, for each collection:

1. Enable "Document Security" in Collection Settings
2. Set default permissions:
   - Create: `user:{$userId}` (users can create their own docs)
   - Read: `user:{$userId}` (users can read their own docs)
   - Update: `user:{$userId}` (users can update their own docs)
   - Delete: `user:{$userId}` (users can delete their own docs)

Collections to configure:
- ✅ plaidTransactions
- ✅ accounts
- ✅ files
- ✅ receiptItems
- ✅ categories
- ✅ tags
- ✅ syncJobs
- ✅ apiKeys
- ⚠️ plaidItems (may need special handling)

### Phase 6: Add MCP Upload Tool 🔄 PRIORITY 3

Add `upload_receipt` tool to `/api/mcp/route.ts`:

```typescript
{
  name: 'upload_receipt',
  description: 'Upload a receipt file (HEIC/JPEG/PNG/PDF) from local filesystem to Appwrite storage',
  inputSchema: {
    type: 'object',
    properties: {
      filePath: {
        type: 'string',
        description: 'Absolute path to the receipt file on local filesystem'
      }
    },
    required: ['filePath']
  }
}
```

Implementation:
- Read file from filesystem
- Convert HEIC to JPEG if needed (using existing heic-convert logic)
- Upload to Appwrite storage with proper permissions
- Create metadata document in files collection
- Return file ID and metadata

---

## Testing Checklist

### Security Tests

- [ ] Try accessing another user's transactions without auth → Should fail
- [ ] Try uploading file without session cookie → Should fail 401
- [ ] Try accessing files list without auth → Should fail
- [ ] Verify session validation works correctly
- [ ] Verify admin endpoints reject non-admin users

### Functionality Tests

- [ ] File upload works with session auth
- [ ] Transactions load via client SDK
- [ ] Accounts load via client SDK
- [ ] Files load via client SDK
- [ ] MCP upload tool works
- [ ] Receipt processing workflow complete

### Frontend Tests

- [ ] All pages load without errors
- [ ] Data displays correctly
- [ ] No broken API calls
- [ ] Session persists across page refreshes

---

## Implementation Order

### Week 1: Critical Security Fixes
1. ✅ Create `lib/auth-helpers.ts` with session validation
2. ✅ Fix `/api/files/upload` with session auth
3. ✅ Fix `/api/files/[fileId]` DELETE with session auth
4. ✅ Set Appwrite collection permissions in dashboard
5. ✅ Test file operations with new auth

### Week 2: Frontend Refactor
6. ⚠️ Update frontend to use client SDK for transactions
7. ⚠️ Update frontend to use client SDK for accounts
8. ⚠️ Update frontend to use client SDK for files
9. ⚠️ Remove old API endpoints (after frontend works)
10. ⚠️ Test all user flows

### Week 3: Remaining Endpoints
11. 🔄 Add session auth to Plaid endpoints
12. 🔄 Add session auth to AI endpoints
13. 🔄 Add admin auth to admin endpoints
14. 🔄 Add MCP upload tool
15. 🔄 Test complete receipt workflow

---

## Estimated Impact

- **Security:** Critical vulnerabilities eliminated
- **Performance:** Faster (fewer API hops, direct Appwrite calls)
- **Code:** Cleaner (less boilerplate API routes)
- **Maintenance:** Easier (leverage Appwrite's built-in security)

---

## Questions to Resolve

1. **Admin identification:** How do we identify admin users? (labels, team, prefs?)
2. **Public data:** Are there any collections that should be publicly readable?
3. **Webhook auth:** Do we need to implement Plaid webhook signature verification?
4. **Rate limiting:** Should we add rate limiting to remaining endpoints?

---

## Next Immediate Steps

1. Get user approval on this plan
2. Create `lib/auth-helpers.ts`
3. Fix `/api/files/upload` as proof of concept
4. Test that file upload works with session auth
5. Configure one collection's permissions in Appwrite
6. Continue with remaining fixes

