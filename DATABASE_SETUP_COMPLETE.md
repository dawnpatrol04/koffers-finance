# Database Setup Complete ✅

**Date:** October 31, 2025
**Database:** Appwrite (koffers_poc)
**Total Collections:** 13

---

## ✨ What Was Completed

### 1. Collections Created (13 total)

#### Core Collections
- ✅ **accounts** - Bank accounts, credit cards, investment accounts
- ✅ **categories** - Transaction categories (Groceries, Gas, etc.)
- ✅ **tags** - Flexible tags (business, personal, custom)
- ✅ **transactions** - Main financial transactions
- ✅ **receiptItems** - Line items from OCR-processed receipts
- ✅ **reminders** - Transaction reminders/alerts
- ✅ **files** - Uploaded documents (receipts, statements, tax docs)

#### Join Tables (Many-to-Many Relationships)
- ✅ **transactionTags** - Links transactions to tags
- ✅ **itemTags** - Links receipt items to tags
- ✅ **fileTags** - Links files to tags

#### Plaid Integration
- ✅ **plaidItems** - Bank connections
- ✅ **plaidTransactions** - Staging area for raw Plaid data

### 2. System Data Seeded

#### Categories (13 total)
**Expense Categories:**
- Groceries (#4caf50)
- Dining Out (#ff9800)
- Gas & Fuel (#f44336)
- Transportation (#2196f3)
- Utilities (#9c27b0)
- Entertainment (#e91e63)
- Shopping (#ff5722)
- Healthcare (#00bcd4)
- Insurance (#607d8b)
- Subscriptions (#795548)

**Income Categories:**
- Salary (#4caf50)
- Other Income (#8bc34a)

**Transfer Category:**
- Transfer (#9e9e9e)

#### Tags (2 system tags)
- business (#1976d2)
- personal (#388e3c)

### 3. Old Collections Cleaned Up

The following obsolete collections were deleted:
- ❌ plaid_items (replaced by plaidItems)
- ❌ plaid_accounts (merged into accounts)
- ❌ plaid_transactions (replaced by plaidTransactions)
- ❌ api_keys (no longer needed)
- ❌ transaction_enrichment (merged into transactions)

---

## 📊 Schema Highlights

### Key Design Decisions

1. **Receipt-First Approach**
   - Files/receipts can exist before matching to transactions
   - Allows upload now, match later workflow
   - `files.transactionId` is nullable

2. **Completion Tracking**
   - Computed on query, not stored
   - `hasReceipt` = `transactions.fileId IS NOT NULL`
   - `hasCommentary` = `transactions.commentary IS NOT NULL`
   - `isReviewed` = `transactions.reviewedAt IS NOT NULL`

3. **Reminders/Alerts System**
   - 1-to-1 relationship with transactions
   - Supports LLM-generated alerts (e.g., "Remind me if refund doesn't come")
   - Unique constraint on `reminders.transactionId`
   - Visual amber banner in UI when present

4. **OCR Data Storage**
   - `files.receiptData` stores JSON with full OCR results
   - Flexible schema allows different receipt formats
   - Includes merchant, date, total, location, lat/long, line items

5. **Plaid Staging Area**
   - Raw Plaid data stored in `plaidTransactions.rawData` (JSON)
   - `processed` flag tracks user approval
   - Links to `transactions` table after processing

---

## 🔗 Relationships Map

```
users (Appwrite Auth)
  ├── 1:Many → accounts
  ├── 1:Many → categories (user-created)
  ├── 1:Many → tags (user-created)
  ├── 1:Many → transactions
  ├── 1:Many → files
  └── 1:Many → plaidItems

transactions (central hub)
  ├── Many:1 → accounts (required)
  ├── Many:1 → categories (optional)
  ├── Many:1 → files (optional, receipt link)
  ├── 1:Many → receiptItems (cascade delete)
  ├── 1:1 → reminders (cascade delete)
  └── Many:Many → tags (via transactionTags)

receiptItems
  └── Many:Many → tags (via itemTags)

files
  ├── Many:1 → transactions (optional)
  └── Many:Many → tags (via fileTags)

plaidItems
  └── 1:Many → plaidTransactions
```

---

## 📝 Field Details

### Transactions Collection

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| accountId | string | ✓ | FK to accounts |
| date | datetime | ✓ | Transaction date |
| amount | float | ✓ | Amount (negative = expense) |
| merchant | string | ✓ | Merchant name |
| merchantSubtext | string | - | Secondary merchant info |
| description | string | - | Original bank description |
| categoryId | string | - | FK to categories |
| status | enum | ✓ | pending/completed/cleared |
| channel | enum | ✓ | in-store/online/other |
| fileId | string | - | FK to files (receipt) |
| commentary | string | - | User notes |
| reviewedBy | string | - | FK to users (who reviewed) |
| reviewedAt | datetime | - | When reviewed |
| plaidTransactionId | string | - | Link to Plaid data |

### Files Collection

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ✓ | Filename |
| type | enum | ✓ | receipt/bank-statement/tax-document/other |
| size | integer | ✓ | File size in bytes |
| mimeType | string | ✓ | MIME type |
| storageFileId | string | ✓ | Appwrite Storage ID |
| url | string | - | Public/signed URL |
| thumbnailUrl | string | - | Thumbnail URL |
| uploadedAt | datetime | ✓ | Upload timestamp |
| isReceipt | boolean | - | Is this a receipt? |
| matchStatus | enum | - | matched/pending/unmatched |
| receiptData | string | - | JSON: OCR results |
| transactionId | string | - | FK to transactions (nullable) |
| title | string | - | User-provided title |
| description | string | - | User-provided description |

### Reminders Collection

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| transactionId | string | ✓ | FK to transactions (UNIQUE) |
| message | string | ✓ | Alert message (max 500 chars) |
| dueDate | datetime | - | Optional due date |
| completed | boolean | - | Has user addressed it? |

---

## 🎨 UI Component Mapping

### Transaction Card Component

**Complete Transaction (has receipt items):**
- Merchant name: **bold, high contrast** (trusted data)
- Date/category: **small, muted** (supporting info)
- Amount: **small font** (not primary)
- Border: **solid**
- Receipt items: **expanded by default**
- Icons: **filled with green**

**Incomplete Transaction (no receipt items):**
- Merchant name: **light, de-emphasized** (untrusted data)
- Date/category: **extra light** (unreliable)
- Amount: **large, emphasized** (only reliable info)
- Border: **dashed**
- No receipt items section
- Icons: **ghost outline** (shadow board effect)

**With Reminder:**
- **Amber banner** with bell icon
- Message displayed prominently
- Creates urgency to complete action

### File Card Component

**Match Status:**
- **Matched** (green): Successfully linked to transaction
- **Pending** (amber): Waiting for OCR processing
- **Needs Attention** (red): No matching transaction found

**Display:**
- Thumbnail preview
- Merchant name from OCR
- Date and amount from receipt
- Location address
- Tags (if any)

---

## 🔥 Next Steps

### 1. Update TypeScript Types

Create/update files to match new schema:

```typescript
// types/transaction.ts
export interface Transaction {
  $id: string;
  accountId: string;
  date: string;
  amount: number;
  merchant: string;
  merchantSubtext?: string;
  description?: string;
  categoryId?: string;
  status: 'pending' | 'completed' | 'cleared';
  channel: 'in-store' | 'online' | 'other';
  fileId?: string;
  commentary?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  plaidTransactionId?: string;

  // Computed properties
  hasReceipt?: boolean;
  hasCommentary?: boolean;
  isReviewed?: boolean;
  hasTags?: boolean;
  hasReminder?: boolean;

  // Related data (joined)
  receiptItems?: ReceiptItem[];
  reminder?: Reminder;
  tags?: Tag[];
  category?: Category;
  file?: File;
}
```

### 2. Build API Endpoints

Create Next.js API routes for:

**Transactions:**
- `GET /api/transactions` - List with filters
- `GET /api/transactions/[id]` - Single transaction with all relationships
- `POST /api/transactions` - Create manual transaction
- `PATCH /api/transactions/[id]` - Update transaction
- `PATCH /api/transactions/[id]/category` - Quick category update
- `POST /api/transactions/[id]/review` - Mark as reviewed

**Files/Receipts:**
- `GET /api/files` - List files
- `POST /api/files/upload` - Upload file
- `POST /api/files/[id]/ocr` - Trigger OCR processing
- `POST /api/files/[id]/match` - Match to transaction

**Reminders:**
- `GET /api/reminders` - List active reminders
- `POST /api/transactions/[id]/reminder` - Add reminder
- `POST /api/reminders/[id]/complete` - Mark complete

**Tags:**
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag
- `POST /api/transactions/[id]/tags` - Add tag to transaction
- `POST /api/receipt-items/[id]/tags` - Add tag to item

### 3. Wire Up UI Components

Update existing demo components to use real data:

**Files to update:**
- `/app/dashboard/transactions-demo/page.tsx` → `/app/dashboard/transactions/page.tsx`
- `/app/dashboard/files-demo/page.tsx` → `/app/dashboard/files/page.tsx`
- `/components/transaction-card.tsx` - Add real data fetching
- `/components/file-card.tsx` - Add real data fetching

**Remove old routes:**
- Delete old `/dashboard/transactions` (without `-demo`)
- Move demo versions to production paths

### 4. Implement Receipt OCR

**OCR Processing Flow:**
1. User uploads receipt → `files` collection
2. Trigger Claude Vision API with receipt image
3. Extract: merchant, date, total, items array, location
4. Store in `files.receiptData` as JSON
5. Create `receiptItems` records
6. Attempt auto-match to existing transaction
7. Update `files.matchStatus`

### 5. Implement AI Categorization

**Categorization Flow:**
1. New transaction comes from Plaid
2. Send to Claude API with:
   - Merchant name
   - Amount
   - Description
   - List of available categories
3. Claude returns category ID
4. Update `transactions.categoryId`
5. Track accuracy, learn from user corrections

### 6. Add Reminder/Alert Generation

**LLM-Generated Reminders:**