# UI to Database Mapping - Complete Reference

This document maps every UI element from our transaction card and file management components to the underlying database schema, ensuring 100% coverage.

## Transaction Card Component Mapping

### Visual States & Computed Properties

| UI Element | UI Property | Database Source | Computation Logic |
|------------|-------------|-----------------|-------------------|
| **Complete State** | `isComplete` | `files.id`, `transactions.commentary` | `hasReceipt && hasCommentary` |
| **Has Receipt Items** | `hasReceiptItems` | `receiptItems[]` count | `receiptItems.length > 0` |
| **Border Style** | Solid vs Dashed | Computed from isComplete | Solid if complete, dashed if incomplete |
| **Background** | Card bg | Static | `bg-card` |

### Header Section

| UI Element | Component Property | Database Table | Database Field | Notes |
|------------|-------------------|----------------|----------------|-------|
| **Unread Indicator** | Blue dot | `transactions` | `reviewedAt` (NULL) | Show if `reviewedAt IS NULL` |
| **Merchant Name** | `transaction.merchant` | `transactions` | `merchant` | De-emphasized if no receipt items |
| **Merchant Styling** | Font weight/color | Computed | - | Bold+dark if has items, light+muted if not |
| **Status Badge** | "Pending" badge | `transactions` | `status` | Show if `status = 'pending'` |
| **Receipt Icon** | FileText icon | `transactions` | `fileId` | Green+filled if exists, ghost outline if null |
| **Commentary Icon** | MessageSquare icon | `transactions` | `commentary` | Green+filled if exists, ghost outline if null |
| **Date** | `transaction.date` | `transactions` | `date` | Format: MM/DD/YYYY |
| **Category** | `transaction.category` | `categories` | `name` | Join via `transactions.categoryId` |
| **Channel** | `transaction.channel` | `transactions` | `channel` | Enum: in-store/online/other |
| **Amount** | `transaction.amount` | `transactions` | `amount` | Negative = expense, format: $X.XX |

### Tags Section

| UI Element | Component Property | Database Table | Database Field | Notes |
|------------|-------------------|----------------|----------------|-------|
| **Transaction Tags** | `transaction.tags[]` | `transactionTags` JOIN `tags` | `tags.label` | Many-to-many via join table |
| **Tag Badge** | Badge variant | `tags` | `tags.color`, `tags.type` | Style based on type |

### Reminder Section

| UI Element | Component Property | Database Table | Database Field | Notes |
|------------|-------------------|----------------|----------------|-------|
| **Has Reminder** | `transaction.hasReminder` | `reminders` | Exists for transaction | Boolean check |
| **Reminder Message** | `transaction.reminder.message` | `reminders` | `message` | Show in amber banner |
| **Reminder Completed** | `transaction.reminder.completed` | `reminders` | `completed` | Boolean flag |

### Receipt Items Section (Expanded)

| UI Element | Component Property | Database Table | Database Field | Notes |
|------------|-------------------|----------------|----------------|-------|
| **Item Name** | `item.name` | `receiptItems` | `name` | e.g., "Organic Bananas" |
| **Item Quantity** | `item.quantity` | `receiptItems` | `quantity` | Display as "Qty: X" |
| **Item Price** | `item.price` | `receiptItems` | `price` | Unit price |
| **Item Category** | `item.category` | `receiptItems` | `category` | Optional item category |
| **Item Tags** | `item.tags[]` | `itemTags` JOIN `tags` | `tags.label` | Many-to-many, business/personal |
| **Sort Order** | Display order | `receiptItems` | `sortOrder` | ASC order |
| **Green Border** | First item highlight | Client-side | - | `index === 0` gets green left border |

---

## File Management Component Mapping

### File Card Properties

| UI Element | Component Property | Database Table | Database Field | Notes |
|------------|-------------------|----------------|----------------|-------|
| **File Name** | `file.name` | `files` | `name` | Original filename |
| **File Type** | `file.type` | `files` | `type` | Enum: receipt/bank-statement/tax-document/other |
| **File Size** | `file.size` | `files` | `size` | Bytes, display as KB/MB |
| **Mime Type** | `file.mimeType` | `files` | `mimeType` | e.g., "image/jpeg" |
| **Upload Date** | `file.uploadedAt` | `files` | `uploadedAt` | Timestamp |
| **Thumbnail** | Image preview | `files` | `thumbnailUrl` | Generated thumbnail URL |
| **Download URL** | Link to file | `files` | `url` | Appwrite Storage signed URL |

### Receipt-Specific Properties

| UI Element | Component Property | Database Table | Database Field | Notes |
|------------|-------------------|----------------|----------------|-------|
| **Is Receipt** | `file.isReceipt` | `files` | `isReceipt` | Boolean flag |
| **Match Status** | Badge color | `files` | `matchStatus` | matched/pending/unmatched |
| **Receipt Data** | OCR results | `files` | `receiptData` (JSON) | Structured JSON with merchant, date, items |
| **Linked Transaction** | Link to transaction | `files` | `transactionId` | FK to transactions table |

### Receipt OCR Data Structure (JSON)

Stored in `files.receiptData`:

```json
{
  "merchant": "Ralphs",
  "date": "2025-10-28",
  "total": 31.76,
  "subtotal": 29.50,
  "tax": 2.26,
  "location": "123 Main St, Los Angeles, CA",
  "latitude": 34.0522,
  "longitude": -118.2437,
  "items": [
    {
      "name": "Organic Bananas",
      "quantity": 1,
      "price": 3.99,
      "category": "Produce"
    }
  ]
}
```

### File Tags

| UI Element | Component Property | Database Table | Database Field | Notes |
|------------|-------------------|----------------|----------------|-------|
| **File Tags** | `file.tags[]` | `fileTags` JOIN `tags` | `tags.label` | Many-to-many relationship |

---

## Account Widget Mapping

| UI Element | Data Source | Database Table | Database Field | Notes |
|------------|-------------|----------------|----------------|-------|
| **Account Name** | Plaid account | `accounts` | `name` | e.g., "Chase Checking" |
| **Institution** | Bank name | `accounts` | `institution` | e.g., "Chase" |
| **Last Four** | Account number | `accounts` | `lastFour` | Masked: "**** 1234" |
| **Current Balance** | Account balance | `accounts` | `currentBalance` | Updated from Plaid sync |
| **Account Type** | checking/savings/credit | `accounts` | `type` | Enum value |
| **Account Color** | Badge color | `accounts` | `color` | Hex color for UI |
| **Is Active** | Show/hide account | `accounts` | `isActive` | Boolean filter |

---

## Plaid Sync Data Flow

### Source: Plaid API → Database

| Plaid API Field | Database Table | Database Field | Processing |
|-----------------|----------------|----------------|------------|
| `transaction_id` | `plaidTransactions` | `plaidTransactionId` | Stored in staging |
| `amount` | `transactions` | `amount` | After user approval |
| `date` | `transactions` | `date` | Processed date |
| `merchant_name` | `transactions` | `merchant` | Extracted name |
| `category` | `categories` | Auto-match or "Uncategorized" | AI categorization |
| `pending` | `transactions` | `status` | Map to enum |

### Processing Flow

1. **Plaid → plaidTransactions** (Raw staging)
   - Store complete Plaid response in `rawData` JSON field
   - Flag as `processed = false`

2. **plaidTransactions → transactions** (After user review)
   - Create transaction record
   - Link via `transactions.plaidTransactionId`
   - Set `plaidTransactions.transactionId` (FK back)
   - Mark `plaidTransactions.processed = true`

3. **Enrichment** (User adds receipt/commentary)
   - Upload receipt → `files` table
   - OCR processing → `files.receiptData` JSON
   - Extract line items → `receiptItems` table
   - Link via `transactions.fileId`
   - Add commentary → `transactions.commentary`

---

## Computed Properties & Business Logic

### Transaction Completion Flags

These are computed on query, not stored:

| UI Flag | Computation Logic | Database Sources |
|---------|------------------|------------------|
| `hasReceipt` | Check if `fileId` exists AND `files.isReceipt = true` | `transactions.fileId` + `files.isReceipt` |
| `hasCommentary` | Check if `commentary` is NOT NULL and NOT empty | `transactions.commentary` |
| `isReviewed` | Check if `reviewedAt` is NOT NULL | `transactions.reviewedAt` |
| `hasTags` | Check if any `transactionTags` records exist | `transactionTags` count |
| `hasReminder` | Check if `reminders` record exists | `reminders` exists |

### SQL Example for Transaction with Completion Flags

```sql
SELECT
    t.id,
    t.merchant,
    t.amount,
    t.date,
    t.status,
    c.name as category,
    -- Completion flags (computed)
    (t.fileId IS NOT NULL) as hasReceipt,
    (t.commentary IS NOT NULL AND t.commentary != '') as hasCommentary,
    (t.reviewedAt IS NOT NULL) as isReviewed,
    (SELECT COUNT(*) FROM transactionTags WHERE transactionId = t.id) > 0 as hasTags,
    (SELECT COUNT(*) FROM reminders WHERE transactionId = t.id) > 0 as hasReminder,
    -- Related data
    (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ri.id, 'name', ri.name, 'quantity', ri.quantity, 'price', ri.price))
     FROM receiptItems ri WHERE ri.transactionId = t.id) as receiptItems,
    r.message as reminderMessage
FROM transactions t
LEFT JOIN categories c ON t.categoryId = c.id
LEFT JOIN reminders r ON t.id = r.transactionId
WHERE t.userId = ?
ORDER BY t.date DESC;
```

---

## API Endpoint Requirements

To support the UI components, we need these API endpoints:

### Transaction Endpoints

| Endpoint | Method | Purpose | Data Returned |
|----------|--------|---------|---------------|
| `/api/transactions` | GET | List transactions | Transactions + completion flags + receiptItems |
| `/api/transactions/:id` | GET | Single transaction | Full transaction with all related data |
| `/api/transactions` | POST | Create manual transaction | Created transaction |
| `/api/transactions/:id` | PATCH | Update transaction | Updated transaction |
| `/api/transactions/:id/category` | PATCH | Update category | Updated transaction |
| `/api/transactions/:id/commentary` | PATCH | Add/update commentary | Updated transaction |
| `/api/transactions/:id/review` | POST | Mark as reviewed | Updated transaction |

### Receipt/File Endpoints

| Endpoint | Method | Purpose | Data Returned |
|----------|--------|---------|---------------|
| `/api/files` | GET | List files | Files with match status |
| `/api/files/upload` | POST | Upload receipt | File record + OCR job started |
| `/api/files/:id/ocr` | GET | Get OCR results | Parsed receipt data |
| `/api/files/:id/match` | POST | Match to transaction | Linked transaction + receiptItems created |

### Tag Endpoints

| Endpoint | Method | Purpose | Data Returned |
|----------|--------|---------|---------------|
| `/api/tags` | GET | List all tags | User tags + system tags |
| `/api/tags` | POST | Create tag | Created tag |
| `/api/transactions/:id/tags` | POST | Add tag to transaction | Updated transactionTags |
| `/api/transactions/:id/tags/:tagId` | DELETE | Remove tag | Success status |
| `/api/receipt-items/:id/tags` | POST | Tag individual item | Updated itemTags |

### Reminder Endpoints

| Endpoint | Method | Purpose | Data Returned |
|----------|--------|---------|---------------|
| `/api/reminders` | GET | List all reminders | Active reminders |
| `/api/transactions/:id/reminder` | POST | Add reminder | Created reminder |
| `/api/reminders/:id` | PATCH | Update reminder | Updated reminder |
| `/api/reminders/:id/complete` | POST | Mark completed | Updated reminder |

---

## Data Integrity Rules

### Required Relationships

1. **Transactions MUST have:**
   - `userId` (FK to users)
   - `accountId` (FK to accounts)
   - `date`
   - `amount`
   - `merchant`

2. **Receipt Items REQUIRE:**
   - `transactionId` (FK to transactions) - CASCADE DELETE
   - `name`
   - `price`

3. **Reminders are 1-to-1 with transactions:**
   - One reminder per transaction (UNIQUE constraint)
   - CASCADE DELETE when transaction deleted

4. **Files can exist independently:**
   - `transactionId` is nullable (receipt uploaded before matching)
   - Can match later via `/api/files/:id/match`

### Cascade Rules

| Parent Table | Child Table | On Delete | Reason |
|--------------|-------------|-----------|--------|
| `transactions` | `receiptItems` | CASCADE | Items only exist with transaction |
| `transactions` | `reminders` | CASCADE | Reminders are transaction-specific |
| `transactions` | `transactionTags` | CASCADE | Tags are transaction-specific |
| `receiptItems` | `itemTags` | CASCADE | Item tags are item-specific |
| `files` | `fileTags` | CASCADE | File tags are file-specific |
| `users` | `transactions` | CASCADE | User deletion removes all data |
| `accounts` | `transactions` | RESTRICT | Don't delete account with transactions |
| `categories` | `transactions` | SET NULL | Preserve transactions if category deleted |
| `tags` | `transactionTags` | CASCADE | Remove tag associations |

---

## Missing Schema Elements (To Discuss)

These UI features may need additional database support:

### 1. Transaction Splits
**UI Need:** One transaction → multiple categories (e.g., groceries with business + personal items)

**Proposed Schema:**
```sql
CREATE TABLE transactionSplits (
    id VARCHAR(36) PRIMARY KEY,
    transactionId VARCHAR(36) NOT NULL,
    categoryId VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    percentage DECIMAL(5, 2), -- Alternative to amount
    notes TEXT,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Recurring Transaction Rules
**UI Need:** Auto-categorize recurring subscriptions (Netflix, rent, etc.)

**Proposed Schema:**
```sql
CREATE TABLE recurringRules (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    merchantPattern VARCHAR(255) NOT NULL, -- Regex or exact match
    categoryId VARCHAR(36) NOT NULL,
    autoApprove BOOLEAN DEFAULT FALSE,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Budgets/Goals
**UI Need:** Monthly spending limits per category

**Proposed Schema:**
```sql
CREATE TABLE budgets (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    categoryId VARCHAR(36),
    monthYear VARCHAR(7) NOT NULL, -- "2025-10"
    amount DECIMAL(10, 2) NOT NULL,
    rollover BOOLEAN DEFAULT FALSE,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Appwrite Implementation Notes

### Collection Names (Singular, lowercase)

- `account` (not "accounts")
- `transaction` (not "transactions")
- `receiptItem` (not "receipt_items")
- `file`
- `category`
- `tag`
- `reminder`
- `transactionTag` (join table)
- `itemTag` (join table)
- `fileTag` (join table)
- `plaidItem`
- `plaidTransaction`

### Attribute Types Mapping

| SQL Type | Appwrite Type | Notes |
|----------|---------------|-------|
| VARCHAR(X) | String | Set size limit |
| TEXT | String | Max size 1MB |
| DECIMAL(15,2) | Double | Float for amounts |
| INT | Integer | Whole numbers |
| BOOLEAN | Boolean | true/false |
| TIMESTAMP | Datetime | ISO 8601 format |
| DATE | Datetime | Store as midnight UTC |
| ENUM | Enum | Create enum attribute |
| JSON | String | Store as JSON string, parse client-side |

### Relationships in Appwrite

Use **relationship attributes** instead of foreign keys:

```javascript
// Example: transactions -> accounts (many-to-one)
{
  type: 'relationship',
  relatedCollection: 'account',
  relationType: 'manyToOne',
  twoWay: true,
  twoWayKey: 'transactions'
}
```

---

## Summary Checklist

### UI Coverage ✅

- [x] Transaction card header (merchant, status, icons)
- [x] Transaction metadata (date, category, channel)
- [x] Transaction amount with styling
- [x] Completion state (complete vs incomplete)
- [x] Receipt items expansion
- [x] Item-level tags
- [x] Transaction-level tags
- [x] Reminders with amber styling
- [x] Unread indicator
- [x] File upload/management
- [x] Receipt OCR data storage
- [x] Match status for receipts
- [x] Account list widget
- [x] Plaid integration data

### Database Coverage ✅

- [x] All UI properties map to database fields
- [x] Computed properties have clear logic
- [x] Relationships are properly defined
- [x] Cascade rules protect data integrity
- [x] JSON storage for flexible OCR data
- [x] Staging area for Plaid sync
- [x] Many-to-many for tags
- [x] Support for manual transactions
- [x] Support for receipt-first workflow

### Next Steps

1. Review missing schema elements (splits, recurring rules, budgets)
2. Implement Appwrite collections based on SCHEMA_DDL.sql
3. Build API endpoints following the endpoint requirements table
4. Add TypeScript types that match the schema
5. Wire up UI components to real data
