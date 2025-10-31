# Koffers Finance - Appwrite Database Schema

**Version:** 1.0
**Last Updated:** October 31, 2025

## Overview

This schema follows industry best practices for personal finance apps (similar to Mint, Quicken, YNAB) while being optimized for our specific UI components and workflow.

## Design Principles

1. **3NF (Third Normal Form)** - Minimize redundancy, separate concerns
2. **Relationships** - Use Appwrite relationships for data integrity
3. **Receipt-First Approach** - Receipts can exist independently and match to transactions later
4. **Audit Trail** - Track who reviewed/modified financial data
5. **Completion Tracking** - Boolean flags for quick UI state rendering

---

## Collections

### 1. `users`
**Purpose:** Store user account information
**Appwrite Built-in:** Yes (use Appwrite Auth)

**Additional Attributes:**
- `preferences` (JSON) - User settings, default categories, etc.
- `stripeCustomerId` (string) - For billing integration
- `created` (datetime)
- `updated` (datetime)

---

### 2. `accounts`
**Purpose:** Bank accounts, credit cards, investment accounts
**Why Needed:** Users can have multiple accounts, transactions belong to accounts

| Field | Type | Required | Description | UI Component Need |
|-------|------|----------|-------------|-------------------|
| `id` | string (auto) | ✓ | Unique identifier | - |
| `userId` | string (relationship) | ✓ | Owner | - |
| `name` | string | ✓ | "Chase Checking", "Amex Blue" | Account selector |
| `type` | enum | ✓ | checking, savings, credit, investment | Account filtering |
| `institution` | string | ✓ | "Chase", "American Express" | Display in UI |
| `lastFour` | string | | Last 4 digits | Account identification |
| `currentBalance` | decimal | | Current balance | Dashboard widget |
| `plaidItemId` | string | | Plaid connection ID | Bank sync |
| `plaidAccountId` | string | | Plaid account ID | Bank sync |
| `isActive` | boolean | ✓ | Active or archived | Filter inactive |
| `color` | string | | Hex color for UI | Visual identification |
| `created` | datetime | ✓ | Created date | - |
| `updated` | datetime | ✓ | Last updated | - |

**Relationships:**
- `userId` → `users.$id` (many-to-one)
- One account has many transactions
- One account has many plaidTransactions

---

### 3. `categories`
**Purpose:** Expense/income categories for classification
**Why Needed:** Standard categorization (similar to Mint/Quicken)

| Field | Type | Required | Description | UI Component Need |
|-------|------|----------|-------------|-------------------|
| `id` | string (auto) | ✓ | Unique identifier | - |
| `userId` | string (relationship) | | NULL for system categories | Custom categories |
| `name` | string | ✓ | "Groceries", "Gas", "Dining Out" | Category selector |
| `parentId` | string (relationship) | | For subcategories | Category hierarchy |
| `type` | enum | ✓ | expense, income, transfer | Transaction type |
| `icon` | string | | Icon name/emoji | Visual display |
| `color` | string | | Hex color | Visual display |
| `isSystem` | boolean | ✓ | System vs user-created | Prevent deletion |
| `sortOrder` | integer | | Display order | Category list |
| `created` | datetime | ✓ | Created date | - |

**Relationships:**
- `userId` → `users.$id` (many-to-one, nullable)
- `parentId` → `categories.$id` (self-referential)
- One category has many transactions

**Pre-populated System Categories:** Groceries, Dining, Transportation, Utilities, Entertainment, Shopping, Healthcare, Insurance, etc.

---

### 4. `transactions`
**Purpose:** Financial transactions from bank feeds or manual entry
**Why Needed:** Core data - what we display in transaction list

| Field | Type | Required | Description | UI Component Need |
|-------|------|----------|-------------|-------------------|
| `id` | string (auto) | ✓ | Unique identifier | - |
| `userId` | string (relationship) | ✓ | Owner | - |
| `accountId` | string (relationship) | ✓ | Source account | Account filter |
| `plaidTransactionId` | string | | Plaid original ID | Sync/deduplication |
| `date` | date | ✓ | Transaction date | **TransactionCard date** |
| `amount` | decimal | ✓ | Amount (negative = expense) | **TransactionCard amount** |
| `merchant` | string | ✓ | Merchant name | **TransactionCard merchant** |
| `merchantSubtext` | string | | Additional merchant info | **TransactionCard subtext** |
| `description` | string | | Original bank description | Search/reference |
| `categoryId` | string (relationship) | | Category | **TransactionCard category** |
| `status` | enum | ✓ | pending, completed, cleared | **TransactionCard status** |
| `channel` | enum | ✓ | in-store, online, other | **TransactionCard channel** |
| `fileId` | string (relationship) | | Linked receipt file | **hasReceipt flag** |
| `commentary` | text | | User notes | **TransactionCard commentary** |
| `reviewedBy` | string (relationship) | | Who reviewed | **TransactionCard reviewedBy** |
| `reviewedAt` | datetime | | When reviewed | **TransactionCard reviewedAt** |
| `created` | datetime | ✓ | Created date | - |
| `updated` | datetime | ✓ | Last updated | - |

**Computed/Virtual Fields (from relationships):**
- `hasReceipt` = `fileId !== null`
- `hasCommentary` = `commentary !== null && commentary !== ""`
- `isReviewed` = `reviewedBy !== null`
- `hasTags` = check if `transactionTags` exist
- `hasReminder` = check if active `reminder` exists

**Relationships:**
- `userId` → `users.$id` (many-to-one)
- `accountId` → `accounts.$id` (many-to-one)
- `categoryId` → `categories.$id` (many-to-one, nullable)
- `fileId` → `files.$id` (one-to-one, nullable)
- `reviewedBy` → `users.$id` (many-to-one, nullable)
- One transaction has many receiptItems
- One transaction has many transactionTags (through join table)
- One transaction has one or zero reminder

---

### 5. `receiptItems`
**Purpose:** Line items from OCR-processed receipts
**Why Needed:** Display itemized breakdown in **TransactionCard** (Ralphs example)

| Field | Type | Required | Description | UI Component Need |
|-------|------|----------|-------------|-------------------|
| `id` | string (auto) | ✓ | Unique identifier | - |
| `transactionId` | string (relationship) | ✓ | Parent transaction | Group items |
| `name` | string | ✓ | Item name | **ReceiptItem name** |
| `quantity` | integer | ✓ | Quantity | **ReceiptItem quantity** |
| `price` | decimal | ✓ | Unit price | **ReceiptItem price** |
| `totalPrice` | decimal | | quantity * price | Validation |
| `category` | string | | Item category (if detected) | **ReceiptItem category** |
| `sku` | string | | Product SKU | Advanced features |
| `sortOrder` | integer | ✓ | Display order | Receipt order |
| `created` | datetime | ✓ | Created date | - |

**Relationships:**
- `transactionId` → `transactions.$id` (many-to-one)
- One receiptItem has many itemTags (through join table)

---

### 6. `tags`
**Purpose:** Custom tags for transactions and items (business, personal, tax-deductible, etc.)
**Why Needed:** Flexible classification beyond categories

| Field | Type | Required | Description | UI Component Need |
|-------|------|----------|-------------|-------------------|
| `id` | string (auto) | ✓ | Unique identifier | - |
| `userId` | string (relationship) | | NULL for system tags | Custom tags |
| `label` | string | ✓ | "business", "personal", "tax-deductible" | **Badge labels** |
| `type` | enum | ✓ | business, personal, custom | **Badge variant** |
| `color` | string | | Hex color | **Badge styling** |
| `isSystem` | boolean | ✓ | System vs user-created | Prevent deletion |
| `created` | datetime | ✓ | Created date | - |

**Pre-populated System Tags:** business, personal

**Relationships:**
- `userId` → `users.$id` (many-to-one, nullable)

---

### 7. `transactionTags`
**Purpose:** Join table - many-to-many between transactions and tags
**Why Needed:** One transaction can have multiple tags

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (auto) | ✓ | Unique identifier |
| `transactionId` | string (relationship) | ✓ | Transaction |
| `tagId` | string (relationship) | ✓ | Tag |
| `created` | datetime | ✓ | Created date |

**Relationships:**
- `transactionId` → `transactions.$id` (many-to-one)
- `tagId` → `tags.$id` (many-to-one)

**Indexes:** Compound index on (`transactionId`, `tagId`) for uniqueness

---

### 8. `itemTags`
**Purpose:** Join table - many-to-many between receiptItems and tags
**Why Needed:** Individual items can be tagged (business vs personal)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (auto) | ✓ | Unique identifier |
| `receiptItemId` | string (relationship) | ✓ | Receipt item |
| `tagId` | string (relationship) | ✓ | Tag |
| `created` | datetime | ✓ | Created date |

**Relationships:**
- `receiptItemId` → `receiptItems.$id` (many-to-one)
- `tagId` → `tags.$id` (many-to-one)

**Indexes:** Compound index on (`receiptItemId`, `tagId`) for uniqueness

---

### 9. `reminders`
**Purpose:** Transaction reminders (e.g., "Tag before month end")
**Why Needed:** **TransactionCard reminder** display

| Field | Type | Required | Description | UI Component Need |
|-------|------|----------|-------------|-------------------|
| `id` | string (auto) | ✓ | Unique identifier | - |
| `transactionId` | string (relationship) | ✓ | Parent transaction | Link to transaction |
| `message` | string | ✓ | Reminder text | **TransactionReminder message** |
| `dueDate` | date | | When reminder is due | Sort by urgency |
| `completed` | boolean | ✓ | Completed status | **TransactionReminder completed** |
| `created` | datetime | ✓ | Created date | - |
| `updated` | datetime | ✓ | Last updated | - |

**Relationships:**
- `transactionId` → `transactions.$id` (one-to-one)

---

### 10. `files`
**Purpose:** Uploaded documents (receipts, bank statements, tax docs)
**Why Needed:** Receipt storage, **FileCard** component

| Field | Type | Required | Description | UI Component Need |
|-------|------|----------|-------------|-------------------|
| `id` | string (auto) | ✓ | Unique identifier | - |
| `userId` | string (relationship) | ✓ | Owner | - |
| `transactionId` | string (relationship) | | Linked transaction | Match status |
| `name` | string | ✓ | Original filename | **FileDocument name** |
| `type` | enum | ✓ | receipt, bank-statement, tax-document, other | **FileDocument type** |
| `size` | integer | ✓ | File size (bytes) | **FileDocument size** |
| `mimeType` | string | ✓ | File MIME type | File handling |
| `storageFileId` | string | ✓ | Appwrite Storage ID | File retrieval |
| `url` | string | | Public/signed URL | **FileDocument url** |
| `thumbnailUrl` | string | | Thumbnail URL | **FileDocument thumbnailUrl** |
| `uploadedAt` | datetime | ✓ | Upload timestamp | **FileDocument uploadedAt** |
| `isReceipt` | boolean | ✓ | Is this a receipt | **FileDocument isReceipt** |
| `matchStatus` | enum | | matched, pending, unmatched | **FileDocument matchStatus** |
| `receiptData` | JSON | | OCR extracted data | **FileDocument receiptData** |
| `title` | string | | User-given title | **FileDocument title** |
| `description` | text | | User description | **FileDocument description** |
| `created` | datetime | ✓ | Created date | - |
| `updated` | datetime | ✓ | Last updated | - |

**receiptData JSON Structure:**
```json
{
  "merchant": "Whole Foods Market",
  "date": "2025-10-30",
  "total": 47.82,
  "location": "123 Main St, San Francisco, CA",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "items": [
    {
      "name": "Organic Bananas",
      "quantity": 1,
      "price": 3.99
    }
  ]
}
```

**Relationships:**
- `userId` → `users.$id` (many-to-one)
- `transactionId` → `transactions.$id` (one-to-one, nullable)
- One file has many fileTags (through join table)

---

### 11. `fileTags`
**Purpose:** Join table - many-to-many between files and tags
**Why Needed:** Files can have tags for organization

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (auto) | ✓ | Unique identifier |
| `fileId` | string (relationship) | ✓ | File |
| `tagId` | string (relationship) | ✓ | Tag |
| `created` | datetime | ✓ | Created date |

**Relationships:**
- `fileId` → `files.$id` (many-to-one)
- `tagId` → `tags.$id` (many-to-one)

**Indexes:** Compound index on (`fileId`, `tagId`) for uniqueness

---

### 12. `plaidItems`
**Purpose:** Track Plaid bank connections
**Why Needed:** Manage bank syncing, refresh tokens

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (auto) | ✓ | Unique identifier |
| `userId` | string (relationship) | ✓ | Owner |
| `itemId` | string | ✓ | Plaid Item ID |
| `accessToken` | string | ✓ | Encrypted access token |
| `institutionId` | string | ✓ | Plaid institution ID |
| `institutionName` | string | ✓ | Bank name |
| `status` | enum | ✓ | active, error, reauth_required |
| `lastSync` | datetime | | Last successful sync |
| `created` | datetime | ✓ | Created date |
| `updated` | datetime | ✓ | Last updated |

**Relationships:**
- `userId` → `users.$id` (many-to-one)

---

### 13. `plaidTransactions`
**Purpose:** Raw Plaid transaction data (staging area)
**Why Needed:** Store original data before user review/matching

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (auto) | ✓ | Unique identifier |
| `userId` | string (relationship) | ✓ | Owner |
| `plaidItemId` | string (relationship) | ✓ | Plaid connection |
| `plaidAccountId` | string | ✓ | Plaid account ID |
| `plaidTransactionId` | string | ✓ | Plaid transaction ID |
| `transactionId` | string (relationship) | | Linked transaction |
| `rawData` | JSON | ✓ | Complete Plaid response |
| `processed` | boolean | ✓ | Converted to transaction |
| `created` | datetime | ✓ | Created date |

**Relationships:**
- `userId` → `users.$id` (many-to-one)
- `plaidItemId` → `plaidItems.$id` (many-to-one)
- `transactionId` → `transactions.$id` (one-to-one, nullable)

**Indexes:** Unique index on `plaidTransactionId` for deduplication

---

## Data Flow & Relationships Diagram

```
users
  ├── accounts
  │     └── transactions
  │           ├── receiptItems
  │           │     └── itemTags → tags
  │           ├── transactionTags → tags
  │           ├── reminders
  │           └── files (receipt)
  │
  ├── files
  │     └── fileTags → tags
  │
  ├── categories (user-created)
  ├── tags (user-created)
  │
  └── plaidItems
        └── plaidTransactions → transactions

System Data (shared):
  ├── categories (system)
  └── tags (system)
```

---

## Key Workflows

### 1. Plaid Bank Sync → Transaction Creation
```
1. Fetch from Plaid API
2. Store in `plaidTransactions` (raw data)
3. Create/update `transactions` (set plaidTransactionId)
4. Match to existing `files` (receipts) if possible
5. Auto-categorize using AI
```

### 2. Receipt Upload → Transaction Matching
```
1. User uploads image
2. Store in Appwrite Storage
3. Create `files` record (matchStatus: unmatched)
4. Run OCR (Claude Vision or similar)
5. Store OCR data in `receiptData` JSON
6. Try to match to `transactions` by date/amount/merchant
7. If match found:
   - Link file to transaction (transactionId)
   - Create `receiptItems` records
   - Update matchStatus: matched
8. If no match:
   - Keep matchStatus: unmatched
   - Show in "needs attention" UI
```

### 3. Manual Transaction Entry
```
1. User creates transaction manually
2. Create `transactions` record
3. Optionally link existing `files` (receipt)
4. Optionally add `receiptItems` manually
5. Add `tags` and `reminders` as needed
```

---

## Indexes for Performance

**Critical Indexes:**
- `transactions.userId` + `transactions.date` (DESC) - Transaction list
- `transactions.accountId` - Filter by account
- `transactions.categoryId` - Category reports
- `files.userId` + `files.uploadedAt` (DESC) - File list
- `files.matchStatus` - Unmatched receipts
- `receiptItems.transactionId` - Load items for transaction
- `plaidTransactions.plaidTransactionId` (UNIQUE) - Deduplication

---

## Migration Notes

**Current State:** We already have some collections from Plaid integration
**Action Items:**
1. Audit existing collections against this schema
2. Add missing fields
3. Create new collections (receiptItems, tags, join tables, etc.)
4. Migrate any existing data
5. Set up relationships in Appwrite console
6. Add indexes

---

## Security & Permissions

**Appwrite Permissions Model:**
- Users can only read/write their own data
- System categories/tags are read-only for all users
- Admin role can access all collections for support

**Sensitive Data:**
- `plaidItems.accessToken` - Encrypt before storing
- `transactions` - User-scoped, never expose other users' data
- `files` - User-scoped, signed URLs with expiration

---

## Questions for Review

1. **Budgets/Goals:** Do we need `budgets` and `goals` collections now or later?
2. **Shared Accounts:** Do we support multiple users per account (couples)?
3. **Splits:** Do we need transaction splits (one transaction → multiple categories)?
4. **Recurring Transactions:** Track recurring patterns (subscriptions)?
5. **Rules:** Auto-categorization rules collection?

---

## Next Steps

1. **Review this schema** - Make sure it covers all UI needs
2. **Create collections in Appwrite** - Set up in dev environment
3. **Update TypeScript types** - Sync types with schema
4. **Build API endpoints** - CRUD operations for each collection
5. **Test data flow** - Plaid → Transactions → Receipts matching
