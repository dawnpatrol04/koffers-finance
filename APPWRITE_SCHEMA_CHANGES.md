# Appwrite Database Schema Changes Required

**Date:** 2025-11-11
**Status:** REQUIRED BEFORE RECEIPT PROCESSING CAN WORK

---

## 1. `files` Collection

**Add these attributes:**

| Attribute Name | Type | Size | Required | Default | Description |
|---------------|------|------|----------|---------|-------------|
| `transactionId` | String | 100 | No | null | Links file to plaidTransactions.$id |
| `fileType` | String (enum) | 50 | Yes | "other" | Type: receipt, return, warranty, invoice, note, other |
| `note` | String | 5000 | No | null | User commentary or note text |
| `includeOnExport` | Boolean | - | No | false | Include in PDF exports |

**Index to add:**
- `transactionId` (ASC) - for efficient querying

---

## 2. `plaidTransactions` Collection

**Add these attributes:**

| Attribute Name | Type | Size | Required | Default | Description |
|---------------|------|------|----------|---------|-------------|
| `commentary` | String | 5000 | No | null | User's notes about transaction |
| `reminderMessage` | String | 500 | No | null | Active reminder text |
| `reminderDueDate` | DateTime | - | No | null | When reminder is due |
| `reminderCompleted` | Boolean | - | No | false | Whether reminder completed |
| `reviewedBy` | String | 100 | No | null | Who reviewed it |
| `reviewedAt` | DateTime | - | No | null | When reviewed |
| `tags` | String (array) | 50 each | No | [] | business, personal, etc. |

**Index to add:**
- `reminderDueDate` (ASC) - for querying upcoming reminders

---

## 3. `receiptItems` Collection

**Create new collection if doesn't exist:**

| Attribute Name | Type | Size | Required | Default | Description |
|---------------|------|------|----------|---------|-------------|
| `userId` | String | 100 | Yes | - | User who owns this item |
| `transactionId` | String | 100 | Yes | - | Links to plaidTransactions.$id |
| `fileId` | String | 100 | No | null | Which receipt file (for multiple) |
| `name` | String | 500 | Yes | - | Item name (e.g., "Organic Bananas") |
| `quantity` | Integer | - | Yes | 1 | Quantity purchased |
| `price` | Float | - | Yes | - | Unit price |
| `totalPrice` | Float | - | Yes | - | quantity * price |
| `category` | String | 100 | No | null | Item category (e.g., "Produce") |
| `tags` | String (array) | 50 each | No | [] | business, personal, etc. |

**Indexes to add:**
- `userId` (ASC)
- `transactionId` (ASC) - for querying all items for a transaction
- `$createdAt` (DESC)

**Permissions:**
- Read: users
- Create: users
- Update: users
- Delete: users

---

## How to Add These Fields

### Via Appwrite Console:
1. Go to https://api.koffers.ai/ (or your Appwrite console URL)
2. Navigate to Database → koffers_production (or your database name)
3. Select each collection
4. Click "Attributes" tab
5. Click "Create Attribute"
6. Add each field listed above

### Order of Operations:
1. ✅ Add fields to `files` collection first
2. ✅ Add fields to `plaidTransactions` collection
3. ✅ Create `receiptItems` collection (if doesn't exist)
4. ✅ Update MCP tools in code
5. ✅ Test receipt processing workflow

---

## Impact if Not Added

Without these schema changes:
- ❌ `link_file_to_transaction` will fail with "Unknown attribute" error
- ❌ Cannot attach receipts to transactions
- ❌ Cannot store receipt line items
- ❌ Cannot track reminders or reviews
- ❌ Receipt processing workflow is blocked

---

## Current Status

**Blocked:** Receipt processing cannot proceed until schema changes are made.

**Next Step:** Add fields to Appwrite console manually, then continue with MCP tool updates.
