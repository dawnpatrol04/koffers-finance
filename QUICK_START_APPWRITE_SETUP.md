# Quick Start: Appwrite Schema Setup (5 minutes)

**Goal:** Add required fields so receipt processing can work

**Location:** https://api.koffers.ai/console

---

## Step 1: Add Fields to `files` Collection (2 min)

1. Login to Appwrite Console
2. Navigate to **Databases** → **koffers_production** (or your database name)
3. Click **files** collection
4. Click **Attributes** tab
5. Add these 4 attributes:

### Attribute 1: transactionId
- Click "Create Attribute" → "String"
- Key: `transactionId`
- Size: `100`
- Required: **No** (uncheck)
- Default: leave empty
- Array: **No** (uncheck)
- **Click Create**

### Attribute 2: fileType
- Click "Create Attribute" → "String"
- Key: `fileType`
- Size: `50`
- Required: **Yes** (check)
- Default: `other`
- Array: **No**
- **Click Create**

### Attribute 3: note
- Click "Create Attribute" → "String"
- Key: `note`
- Size: `5000`
- Required: **No**
- Default: leave empty
- Array: **No**
- **Click Create**

### Attribute 4: includeOnExport
- Click "Create Attribute" → "Boolean"
- Key: `includeOnExport`
- Required: **No**
- Default: `false`
- Array: **No**
- **Click Create**

---

## Step 2: Add Fields to `plaidTransactions` Collection (2 min)

1. Go back to Collections
2. Click **plaidTransactions** collection
3. Click **Attributes** tab
4. Add these attributes:

### commentary
- Type: String, Size: 5000, Required: No

### reminderMessage
- Type: String, Size: 500, Required: No

### reminderDueDate
- Type: DateTime, Required: No

### reminderCompleted
- Type: Boolean, Required: No, Default: false

### reviewedBy
- Type: String, Size: 100, Required: No

### reviewedAt
- Type: DateTime, Required: No

### tags
- Type: String, Size: 50, Required: No, **Array: Yes** ✅

---

## Step 3: Create `receiptItems` Collection (1 min)

1. Go back to Collections list
2. Click "Create Collection"
3. Collection ID: `receiptItems`
4. Collection Name: `receiptItems`
5. Click Create

Now add these attributes to the new collection:

- `userId` - String, 100, Required: Yes
- `transactionId` - String, 100, Required: Yes
- `fileId` - String, 100, Required: No
- `name` - String, 500, Required: Yes
- `quantity` - Integer, Required: Yes, Default: 1
- `price` - Float, Required: Yes
- `totalPrice` - Float, Required: Yes
- `category` - String, 100, Required: No
- `tags` - String, 50, Required: No, **Array: Yes**

### Set Permissions:
- Click **Settings** tab (on receiptItems collection)
- Under **Document Security**, add:
  - Read: `users`
  - Create: `users`
  - Update: `users`
  - Delete: `users`

---

## Done!

Once complete, let me know and I'll test the receipt processing workflow with the Subway receipt!

**Total Time:** ~5-10 minutes
