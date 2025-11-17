# Appwrite Collection Permissions Fix - January 16, 2025

## Problem

Users were unable to see any data (transactions, chat, etc.) even though they were logged in. All API calls were returning:
```
401 Unauthorized: The current user is not authorized to perform the requested action.
```

## Root Cause

The Appwrite collections had **Document Security enabled** (`documentSecurity: true`) but the documents themselves had **NO permissions** set (`$permissions: []`).

When document security is enabled, each document needs explicit permission entries. Without them, even authenticated users cannot read the documents, even though the collection has `read("users")` permission.

## Collections Affected

- ✅ `plaidTransactions` - 3,729 documents with no permissions
- ✅ `accounts` - All documents with no permissions
- ✅ `subscriptions` - All documents with no permissions
- ✅ `chatMessages` - Already had document security disabled
- ✅ `conversations` - Already had document security disabled

## Solution Applied

Disabled document security for all collections that don't need per-document permissions:

```javascript
await databases.updateCollection(
  DATABASE_ID,
  COLLECTION_ID,
  COLLECTION_NAME,
  [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ],
  false, // documentSecurity = FALSE (key fix!)
  true   // enabled
);
```

## Collections Fixed

| Collection | Document Security | Permissions |
|------------|------------------|-------------|
| accounts | ❌ **DISABLED** | read/create/update/delete for users |
| plaidTransactions | ❌ **DISABLED** | read/create/update/delete for users |
| subscriptions | ❌ **DISABLED** | read/create/update for users |
| chatMessages | ❌ **DISABLED** | read/create/delete for users, update for any |
| conversations | ❌ **DISABLED** | read/create/update/delete for users |

## User Action Required

**Users MUST log out and log back in** to refresh their Appwrite session with the new permissions.

### How to Log Out

1. Go to https://koffers.ai/dashboard
2. Click user avatar in top right
3. Click "Log Out"
4. Log back in with credentials

OR

Clear browser cookies for `koffers.ai` and reload the page.

## Verification

After logging back in, verify that:

1. ✅ Dashboard shows account balances
2. ✅ Transactions page loads all transactions (should see 3,729 total)
3. ✅ Chat submit button is enabled
4. ✅ No "Unauthorized" errors in browser console

## Technical Details

### What Document Security Does

- When `documentSecurity: true`: Each document needs individual `$permissions` array
- When `documentSecurity: false`: Collection-level permissions apply to ALL documents

### Why This Happened

Documents were created without setting `$permissions`:

```javascript
// ❌ Wrong - creates document with no permissions
await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
  userId: userId,
  amount: 100,
  // ... other fields
});

// ✅ Right (if using document security)
await databases.createDocument(
  DATABASE_ID,
  COLLECTION_ID,
  ID.unique(),
  { userId: userId, amount: 100 },
  [Permission.read(Role.user(userId))] // Per-document permissions
);
```

### Best Practice

For most use cases, **disable document security** and use collection-level permissions. Only enable it when you need fine-grained per-document access control (e.g., private documents, team-specific docs).

## Files Created

- `/scripts/fix-collection-permissions.js` - Script to fix all collections
- `/docs/PERMISSIONS_FIX_2025-01-16.md` - This document

## References

- Appwrite Permissions Documentation: https://appwrite.io/docs/products/auth/permissions
- Collection Security: https://appwrite.io/docs/products/databases/collections#security
