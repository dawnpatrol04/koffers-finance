# Authorization Patterns Analysis - Koffers Finance Codebase

**Date:** November 15, 2025
**Status:** CRITICAL SECURITY FINDINGS
**Analyzed Files:** 16 API routes + 4 data layer modules + 2 auth modules

---

## Executive Summary

This analysis examines ALL authorization patterns in the Koffers codebase to identify what works correctly and what creates security vulnerabilities.

### Key Findings

1. **API Routes (Session-based):** 11/11 correctly filter by userId
2. **MCP Route (API key-based):** Correctly validates API key and gets userId
3. **Data Layer Functions:** 4/4 functions have CRITICAL FLAWS - **MISSING userId filters**
4. **Root Cause:** Data layer was written assuming it would only be called by authenticated routes, but it queries data WITHOUT userId filters

### Security Impact

The data layer functions use `createSessionClient()` which validates that A user is logged in, but they don't filter results by that user's ID. This means:

- Any authenticated user can see ALL users' data
- MCP route calls these functions and gets ALL users' data
- The authorization check passes, but the data access is unrestricted

---

## Section 1: Correct Patterns (What Works)

### Pattern 1A: Session-Based API Routes with Direct Queries

These routes get the userId from `getCurrentUser()` and query Appwrite directly with userId filter.

#### Example 1: `/app/api/keys/route.ts` - List API Keys (GET)

```typescript
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();
    const keys = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.API_KEYS,
      [Query.equal('userId', user.$id), Query.orderDesc('$createdAt')]
      // ^^^^^^^^^^^^^^^^^^^^^^^^ CORRECT - Filters by userId!
    );

    return NextResponse.json({ keys: safeKeys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Why this works:**
- Gets userId from `getCurrentUser()` (session-based)
- Queries Appwrite with `Query.equal('userId', user.$id)`
- Only returns data belonging to the authenticated user

#### Example 2: `/app/api/keys/[keyId]/route.ts` - Delete API Key (DELETE)

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await params;
    const { databases } = await createAdminClient();

    // Verify the key belongs to the user before deleting
    const key = await databases.getDocument(DATABASE_ID, COLLECTIONS.API_KEYS, keyId);

    if (key.userId !== user.$id) {
      // ^^^^^^^^^^^^^^^^^^^ CORRECT - Ownership verification!
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.API_KEYS, keyId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Why this works:**
- Gets userId from `getCurrentUser()`
- Fetches the document to verify ownership
- Checks `key.userId !== user.$id` before allowing deletion
- Two-step authorization: authentication + ownership verification

#### Example 3: `/app/api/plaid/fetch-data/route.ts` - Sync Transactions (POST)

```typescript
export async function POST(request: NextRequest) {
  try {
    // Validate session and get userId securely
    const { account } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;

    // ... [sync logic] ...

    // Get all Plaid items for this user
    const itemsResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.PLAID_ITEMS,
      [Query.equal('userId', userId)]
      // ^^^^^^^^^^^^^^^^^^^^^^^^^^^ CORRECT - Filters by userId!
    );

    // When creating accounts, includes userId
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ACCOUNTS,
      ID.unique(),
      {
        userId,  // ← CORRECT - Sets userId on creation!
        name: account.official_name || account.name,
        // ...
      }
    );

    // When creating transactions, includes userId
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.PLAID_TRANSACTIONS,
      ID.unique(),
      {
        userId,  // ← CORRECT - Sets userId on creation!
        plaidItemId: item.$id,
        // ...
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Why this works:**
- Uses `createSessionClient()` and gets userId
- Filters all queries by userId
- Sets userId on all created documents
- Complete isolation of user data

#### Example 4: `/app/api/files/[fileId]/route.ts` - Delete File (DELETE)

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;

    const { storage, databases } = await createAdminClient();
    const { fileId } = await params;

    // Get file metadata from database
    const fileDocs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.FILES,
      [
        Query.equal('fileId', fileId),
        Query.equal('userId', userId),  // ← CORRECT - Filters by userId!
        Query.limit(1)
      ]
    );

    if (fileDocs.documents.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Delete from storage and database
    await storage.deleteFile(STORAGE_BUCKETS.FILES, fileId);
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.FILES, fileDoc.$id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Why this works:**
- Gets userId from session
- Queries with BOTH fileId and userId filters
- Returns 404 if file doesn't belong to user (no leak of "file exists but not yours")
- Complete authorization enforcement

### Pattern 1B: MCP Route with API Key Validation

The MCP route uses a different auth mechanism but still correctly gets and uses userId.

#### Example: `/app/api/mcp/route.ts` - API Key Authentication

```typescript
// Validate API key and return userId
async function validateApiKey(apiKey: string): Promise<string | null> {
  if (!apiKey || !apiKey.startsWith('kf_live_')) {
    return null;
  }

  try {
    const { databases } = await createAdminClient();
    const keysResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.API_KEYS,
      [Query.equal('keyValue', apiKey), Query.limit(1)]
    );

    if (keysResponse.documents.length === 0) {
      return null;
    }

    const keyDoc = keysResponse.documents[0];

    // Check if key is expired
    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      return null;
    }

    return keyDoc.userId;  // ← Returns userId of API key owner
  } catch (error) {
    console.error('API key validation error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = authHeader?.replace('Bearer ', '') || /* ... */;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Validate API key
    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 403 });
    }

    // Now have userId from API key owner
    // ... handle MCP methods ...
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Why this works:**
- API key lookup returns `keyDoc.userId` (the owner of the key)
- Validates API key is not expired
- Returns userId for use in subsequent operations
- Correct authentication flow

### Summary of Correct Patterns

All **11 API routes** follow these correct patterns:

1. **Session-based routes:**
   - Use `getCurrentUser()` or `createSessionClient()` to get userId
   - Apply `Query.equal('userId', userId)` to ALL database queries
   - Set userId on ALL document creations
   - Verify ownership before updates/deletes

2. **API key route:**
   - Use `validateApiKey()` to get userId from API key owner
   - Pass userId to all subsequent operations

---

## Section 2: Broken Patterns (What's Wrong)

### The Critical Flaw: Data Layer Functions

All 4 data layer modules have the SAME critical flaw: they use `createSessionClient()` which validates authentication, but they DON'T filter results by userId.

#### Broken Pattern 1: `/lib/data/accounts.ts` - getAccounts()

```typescript
export async function getAccounts(userId: string): Promise<Account[]> {
  const { databases } = await createSessionClient();
  //                    ^^^^^^^^^^^^^^^^^^^^^^
  //                    Gets session - validates A user is logged in
  //                    BUT doesn't use the session's userId!

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    [Query.equal('userId', userId)]
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Uses the PARAMETER userId, not the session's userId!
  );

  return response.documents.map(/* ... */);
}
```

**The Bug:**
- Function accepts `userId` as a parameter
- Uses `createSessionClient()` which validates a session exists
- But the session's userId is NEVER verified against the parameter `userId`
- **An authenticated user can call `getAccounts('any-user-id-here')` and see that user's accounts!**

**How to exploit:**
```typescript
// Attacker is logged in as user123
const attackerUserId = 'user123';

// Attacker calls API with victim's userId
const victimAccounts = await getAccounts('victim456');
// ✅ createSessionClient() passes (attacker is authenticated)
// ✅ Query executes with userId='victim456'
// 💥 Attacker sees victim's accounts!
```

#### Broken Pattern 2: `/lib/data/transactions.ts` - getTransactions()

```typescript
export async function getTransactions(
  userId: string,
  params: TransactionSearchParams = {}
): Promise<Transaction[]> {
  const { databases } = await createSessionClient();
  //                    ^^^^^^^^^^^^^^^^^^^^^^
  //                    Validates A user is logged in
  //                    Doesn't verify it's THIS userId!

  const queries = [
    Query.equal('userId', userId),  // ← Uses PARAMETER, not session userId!
    Query.limit(Math.min(limit, 500)),
    Query.orderDesc('$createdAt'),
  ];

  // ... applies filters ...

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PLAID_TRANSACTIONS,
    queries
  );

  return response.documents.map(/* ... */);
}
```

**The Bug:**
- Same issue: parameter `userId` is never validated against session userId
- Any authenticated user can pass any userId
- Complete authorization bypass

**How to exploit:**
```typescript
// Attacker calls MCP tool or API endpoint that uses this function
const victimTransactions = await getTransactions('victim789', {
  limit: 500
});
// 💥 Attacker sees victim's transactions!
```

#### Broken Pattern 3: `/lib/data/files.ts` - All functions

```typescript
export async function listUnprocessedFiles(
  userId: string,
  limit: number = 50
): Promise<FileRecord[]> {
  const { databases } = await createSessionClient();
  //                    ^^^^^^^^^^^^^^^^^^^^^^
  //                    Same bug - validates authentication only!

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.FILES,
    [
      Query.equal('userId', userId),  // ← Parameter userId, not session!
      Query.equal('ocrStatus', 'pending'),
      Query.limit(limit),
      Query.orderDesc('$createdAt')
    ]
  );

  return response.documents.map(/* ... */);
}
```

```typescript
export async function viewFile(
  userId: string,
  fileId: string
): Promise<FileViewResult> {
  const { databases, storage } = await createSessionClient();

  const fileRecords = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.FILES,
    [
      Query.equal('userId', userId),  // ← Parameter userId!
      Query.equal('fileId', fileId),
      Query.limit(1)
    ]
  );

  // ... returns file data ...
}
```

**The Bug:**
- Same pattern across ALL file functions
- Parameter userId is never validated
- Can view, list, and link ANY user's files

#### Broken Pattern 4: `/lib/data/receipts.ts` - All functions

```typescript
export async function saveReceiptItems(
  userId: string,
  transactionId: string,
  items: ReceiptItem[],
  fileId?: string
): Promise<SaveReceiptItemsResult> {
  const { databases } = await createSessionClient();

  for (let i = 0; i < items.length; i++) {
    const newItem = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.RECEIPT_ITEMS,
      ID.unique(),
      {
        userId,  // ← Sets parameter userId, no validation!
        transactionId,
        fileId: fileId || null,
        // ...
      }
    );
  }
  // ...
}
```

**The Bug:**
- Can create receipt items with ANY userId
- Can pollute other users' data
- No authorization check at all

### Summary of Broken Patterns

**All 4 data layer modules have the same vulnerability:**

| File | Functions Affected | Vulnerability |
|------|-------------------|---------------|
| `lib/data/accounts.ts` | `getAccounts()`, `getTotalBalance()`, `getAccountById()`, `getAccountsSummary()` | Accept userId parameter, never validate it against session |
| `lib/data/transactions.ts` | `getTransactions()`, `searchTransactions()`, `getSpendingSummary()` | Same - parameter userId not validated |
| `lib/data/files.ts` | `listUnprocessedFiles()`, `viewFile()`, `linkFileToTransaction()`, `listFiles()` | Same - parameter userId not validated |
| `lib/data/receipts.ts` | `saveReceiptItems()`, `getReceiptItemsByTransaction()`, `getReceiptItemsByFile()`, `deleteReceiptItemsByTransaction()` | Same - parameter userId not validated |

**Total vulnerable functions:** 15 functions

---

## Section 3: Root Cause Analysis

### Why Do We Have This Inconsistency?

#### Historical Context

The codebase shows evidence of multiple development phases:

1. **Phase 1: API Routes (Early Development)**
   - Built with session-based auth from the start
   - Each route gets userId from `getCurrentUser()`
   - Each route queries Appwrite directly with userId filter
   - **Result:** All API routes are secure

2. **Phase 2: Data Layer Abstraction (Refactoring)**
   - Developers wanted to share business logic
   - Created `/lib/data/*` modules to avoid code duplication
   - Made functions accept `userId` as parameter
   - **BUT:** Used `createSessionClient()` instead of `createAdminClient()`
   - **MISTAKE:** Assumed the caller would always be an authenticated route passing correct userId

3. **Phase 3: MCP Integration (New Feature)**
   - Added MCP route with API key authentication
   - MCP route validates API key and gets userId
   - MCP route calls data layer functions passing userId
   - **PROBLEM:** Data layer functions don't validate userId matches session!

### The Architectural Flaw

The data layer functions have a **design contradiction:**

```typescript
// The function signature says "tell me which user's data to get"
export async function getAccounts(userId: string): Promise<Account[]> {

  // But the implementation says "I'll verify you're logged in"
  const { databases } = await createSessionClient();

  // And then trusts whatever userId you passed!
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    [Query.equal('userId', userId)]  // ← No validation!
  );
}
```

**This creates two problems:**

1. **False sense of security:** Using `createSessionClient()` looks like it's doing authorization
2. **Missing verification:** The session's userId is never compared to the parameter userId

### Why API Routes Work But Data Layer Doesn't

**API Routes:**
```typescript
// Route gets userId from session
const user = await getCurrentUser();
const userId = user.$id;

// Route queries Appwrite with that userId
const data = await databases.listDocuments(
  DATABASE_ID,
  COLLECTION,
  [Query.equal('userId', userId)]  // ← Uses the VERIFIED userId
);
```

**Data Layer:**
```typescript
// Function accepts userId as parameter (unverified!)
export async function getData(userId: string) {

  // Creates session client (validates A session exists)
  const { databases } = await createSessionClient();

  // Uses the PARAMETER userId (could be anyone's!)
  const data = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION,
    [Query.equal('userId', userId)]  // ← DANGER!
  );
}
```

### The Intended vs Actual Behavior

**What developers intended:**
- "These functions are only called by authenticated API routes"
- "The API route will get the userId from session and pass it"
- "So the userId parameter will always be the authenticated user's ID"

**What actually happens:**
- MCP route calls these functions with userId from API key
- **BUT:** The MCP route could pass ANY userId
- **AND:** The data layer functions never verify it matches the session
- **RESULT:** Authorization bypass

---

## Section 4: The Correct Standard

Here are the patterns that should be used everywhere in the codebase.

### Standard 1: API Routes with Session Authentication

**For routes accessed by logged-in users via web browser:**

```typescript
export async function GET(request: NextRequest) {
  try {
    // Step 1: Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Use createAdminClient for database operations
    const { databases } = await createAdminClient();

    // Step 3: Query with userId filter
    const data = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.COLLECTION_NAME,
      [
        Query.equal('userId', user.$id),  // ← ALWAYS filter by userId!
        Query.orderDesc('$createdAt')
      ]
    );

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Key principles:**
1. Get userId from `getCurrentUser()` (session-based)
2. Use `createAdminClient()` for database operations (not createSessionClient)
3. ALWAYS include `Query.equal('userId', user.$id)` in queries
4. ALWAYS set userId on document creation

### Standard 2: API Routes with Ownership Verification

**For routes that modify/delete specific documents:**

```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    // Step 1: Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { documentId } = await params;
    const { databases } = await createAdminClient();

    // Step 2: Fetch document and verify ownership
    const document = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.COLLECTION_NAME,
      documentId
    );

    if (document.userId !== user.$id) {
      // ^^^^^^^^^^^^^^^^^^^^^^^^^ CRITICAL - Ownership check!
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Step 3: Perform operation
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.COLLECTION_NAME,
      documentId
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Key principles:**
1. Get userId from session
2. Fetch the document
3. **Verify `document.userId === user.$id` before allowing operation**
4. Return 403 Forbidden if ownership check fails

### Standard 3: MCP Route with API Key Authentication

**For MCP route that uses API keys:**

```typescript
export async function POST(request: NextRequest) {
  try {
    // Step 1: Get and validate API key
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    // Step 2: Validate API key and get userId
    const userId = await validateApiKey(apiKey);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
    }

    // Step 3: Call data layer functions with userId
    switch (toolName) {
      case 'get_accounts':
        const accounts = await accountsData.getAccountsSummary(userId);
        // ^^^^^^^^ Pass userId to data layer
        return NextResponse.json({ accounts });

      case 'get_transactions':
        const transactions = await transactionsData.getTransactions(userId, params);
        // ^^^^^^^^ Pass userId to data layer
        return NextResponse.json({ transactions });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Key principles:**
1. Validate API key
2. Get userId from API key owner
3. Pass userId to data layer functions
4. **Data layer MUST validate this userId!**

### Standard 4: Data Layer Functions (THE FIX!)

**This is the critical fix needed for all data layer functions:**

```typescript
/**
 * CORRECT PATTERN - Validates userId matches session
 */
export async function getAccounts(userId: string): Promise<Account[]> {
  // Step 1: Create session client and verify userId
  const { databases, account } = await createSessionClient();
  const sessionUser = await account.get();

  // Step 2: CRITICAL - Verify userId matches session
  if (sessionUser.$id !== userId) {
    throw new Error('Unauthorized: userId does not match authenticated session');
  }

  // Step 3: Now safe to query with userId
  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    [Query.equal('userId', userId)]
  );

  return response.documents.map(/* ... */);
}
```

**Alternative Pattern - Use Admin Client (Better!):**

```typescript
/**
 * BETTER PATTERN - Use admin client instead
 */
export async function getAccounts(userId: string): Promise<Account[]> {
  // No session validation - caller must provide valid userId
  // Caller (API route or MCP route) is responsible for auth

  const { databases } = await createAdminClient();

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    [Query.equal('userId', userId)]
  );

  return response.documents.map(/* ... */);
}
```

**But with this pattern, the API routes MUST verify userId:**

```typescript
// In API route
const user = await getCurrentUser();
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Safe to call - we verified user identity first
const accounts = await getAccounts(user.$id);
```

**And MCP route MUST verify API key:**

```typescript
// In MCP route
const userId = await validateApiKey(apiKey);
if (!userId) {
  return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });
}

// Safe to call - we verified API key and got owner's userId
const accounts = await getAccounts(userId);
```

### Comparison: Current vs Correct

**Current (BROKEN):**
```typescript
// lib/data/accounts.ts
export async function getAccounts(userId: string) {
  const { databases } = await createSessionClient();
  // ❌ Validates A session exists, but doesn't verify it's THIS userId

  return await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    [Query.equal('userId', userId)]  // ❌ Uses unverified parameter
  );
}
```

**Correct Option 1 (Session Validation):**
```typescript
// lib/data/accounts.ts
export async function getAccounts(userId: string) {
  const { databases, account } = await createSessionClient();
  const sessionUser = await account.get();

  // ✅ Verify userId matches session
  if (sessionUser.$id !== userId) {
    throw new Error('Unauthorized: userId mismatch');
  }

  return await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    [Query.equal('userId', userId)]  // ✅ Now verified!
  );
}
```

**Correct Option 2 (Admin Client - RECOMMENDED):**
```typescript
// lib/data/accounts.ts
export async function getAccounts(userId: string) {
  const { databases } = await createAdminClient();
  // ✅ No session check - relies on caller to authenticate

  return await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.ACCOUNTS,
    [Query.equal('userId', userId)]  // ✅ Caller is responsible for auth
  );
}
```

---

## Section 5: Recommendations

### Immediate Actions Required

1. **Fix all data layer functions**
   - Choose Option 2 (Admin Client) for simplicity
   - Remove `createSessionClient()` calls
   - Use `createAdminClient()` instead
   - Add documentation that caller MUST authenticate

2. **Add tests**
   - Test that users can't access other users' data
   - Test MCP route with different userIds
   - Test API routes with session spoofing attempts

3. **Security audit**
   - Review all existing API keys
   - Check database for any cross-user data access
   - Verify Appwrite permissions are set correctly

### Long-term Improvements

1. **Type-safe userId handling**
   - Create a `VerifiedUserId` type that can only be created by auth functions
   - Prevents passing unverified userIds to data layer

2. **Centralized auth middleware**
   - Create reusable auth middleware for API routes
   - Ensures consistent authorization checks

3. **Database-level permissions**
   - Configure Appwrite document-level permissions
   - Add another layer of protection beyond application logic

---

## Conclusion

The Koffers codebase has a **critical authorization vulnerability** in all data layer functions. While API routes correctly authenticate and filter by userId, the data layer functions use `createSessionClient()` which creates a false sense of security without actually validating the userId parameter.

**The fix is straightforward:**
- Change data layer to use `createAdminClient()` instead of `createSessionClient()`
- Rely on API routes and MCP route to authenticate before calling data layer
- Add documentation and tests to prevent regression

**Impact of not fixing:**
- Any authenticated user can view/modify ANY other user's data
- MCP route can access all users' data with a single API key
- Complete authorization bypass

This analysis has identified 15 vulnerable functions across 4 data layer modules that require immediate remediation.
