# Usage Metrics Tracking Implementation Plan

## Overview

We need to track 3 key metrics that determine subscription limits and billing:

1. **LLM Token Usage** - AI chat messages per month
2. **Storage Usage** - Total size of all uploaded files (receipts, documents)
3. **Bank Connections** - Total number of Plaid institution connections

---

## 1. LLM Token Usage Tracking

### AI SDK Token Counting

The Vercel AI SDK provides built-in token usage tracking.

**Where We Use AI SDK:**
- `app/api/chat/route.ts` - LLM chat endpoint

**AI SDK Response Structure:**
```typescript
const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages,
});

// After streaming completes, AI SDK provides usage:
const usage = result.usage;
// {
//   promptTokens: 1234,
//   completionTokens: 567,
//   totalTokens: 1801
// }
```

**Official Documentation:**
- https://sdk.vercel.ai/docs/ai-sdk-core/telemetry-and-observability
- https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text#usage

### Implementation Strategy

**Option A: Count Messages (Simple)**
- Track number of chat messages sent per user per month
- 1 message ≈ ~2000-5000 tokens average
- Easier to explain to users ("100 messages/month")
- Less precise but simpler

**Option B: Count Actual Tokens (Accurate)**
- Track exact token count from AI SDK
- More accurate billing
- Harder to explain to users
- Need to sum prompt + completion tokens

**Recommendation: Option A (Count Messages)**
- Users understand "messages" better than "tokens"
- Simpler implementation
- Matches industry standards (ChatGPT shows message count)

### Database Schema

**Add to `subscriptions` collection:**
```typescript
{
  // Existing fields...
  currentChatsUsed: number;        // Messages used this billing period
  chatUsageResetDate: string;      // ISO date when counter resets
}
```

**OR create separate `usage` collection for detailed tracking:**
```typescript
{
  userId: string;
  month: string;              // "2024-11"
  chatMessages: number;       // Total messages this month
  chatTokens: number;         // Optional: actual tokens used
  storageBytes: number;       // Total storage used
  bankConnections: number;    // Total institutions connected
}
```

### Tracking Implementation

**In chat API route:**
```typescript
// app/api/chat/route.ts
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check current usage
  const { subscription } = await checkSubscriptionAccess();

  if (subscription.currentChatsUsed >= subscription.maxChatsPerMonth) {
    return NextResponse.json(
      { error: 'Chat limit reached. Please upgrade your plan.' },
      { status: 429 }
    );
  }

  // Process chat
  const result = await streamText({ model, messages });

  // Increment usage counter
  await incrementChatUsage(user.$id);

  return result.toDataStreamResponse();
}

async function incrementChatUsage(userId: string) {
  const { databases } = await createAdminClient();

  // Get current subscription
  const subs = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  const subscription = subs.documents[0];

  // Check if we need to reset (new month)
  const now = new Date();
  const resetDate = new Date(subscription.chatUsageResetDate);

  let currentUsage = subscription.currentChatsUsed;

  if (now > resetDate) {
    // Reset to 0 for new month
    currentUsage = 0;
  }

  // Increment
  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subscription.$id,
    {
      currentChatsUsed: currentUsage + 1,
      chatUsageResetDate: now > resetDate ? getNextMonthDate() : subscription.chatUsageResetDate
    }
  );
}

function getNextMonthDate(): string {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth.toISOString();
}
```

---

## 2. Storage Usage Tracking

### Measuring File Storage

**What We Need to Track:**
- Total size of all files uploaded by a user
- Stored in Appwrite Storage buckets

**Appwrite Storage API:**
```typescript
import { Storage } from 'node-appwrite';

const storage = new Storage(client);

// Get file metadata (includes size)
const file = await storage.getFile(bucketId, fileId);
// file.sizeOriginal = size in bytes
```

### Implementation Strategy

**Option A: Track on Upload (Recommended)**
- When file is uploaded, add its size to running total
- Store total in subscription record
- Fast queries, no recalculation needed

**Option B: Calculate on Demand**
- Query all user files and sum sizes
- Accurate but slow
- Good for verification/auditing

**Recommendation: Option A (Track on Upload)**

### Database Schema

**Add to `subscriptions` collection:**
```typescript
{
  currentStorageUsedGB: number;  // Total storage in GB
  // Convert bytes to GB: bytes / (1024 * 1024 * 1024)
}
```

### Tracking Implementation

**In file upload API:**
```typescript
// app/api/files/upload/route.ts
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  // Check current storage usage
  const { subscription } = await checkSubscriptionAccess();

  const formData = await request.formData();
  const file = formData.get('file') as File;

  // Check if adding this file would exceed limit
  const fileSizeGB = file.size / (1024 * 1024 * 1024);
  const newTotal = subscription.currentStorageUsedGB + fileSizeGB;

  if (newTotal > subscription.maxStorageGB) {
    return NextResponse.json(
      { error: 'Storage limit reached. Please upgrade your plan.' },
      { status: 429 }
    );
  }

  // Upload file
  const { storage } = await createAdminClient();
  const uploadedFile = await storage.createFile(
    STORAGE_BUCKETS.RECEIPTS,
    ID.unique(),
    file
  );

  // Update storage usage
  await incrementStorageUsage(user.$id, fileSizeGB);

  return NextResponse.json({ file: uploadedFile });
}

async function incrementStorageUsage(userId: string, sizeGB: number) {
  const { databases } = await createAdminClient();

  const subs = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  const subscription = subs.documents[0];

  await databases.updateDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    subscription.$id,
    {
      currentStorageUsedGB: subscription.currentStorageUsedGB + sizeGB
    }
  );
}
```

**On file deletion:**
```typescript
// app/api/files/[fileId]/route.ts DELETE
export async function DELETE(request: NextRequest, { params }) {
  const user = await getCurrentUser();

  // Get file metadata first
  const { storage } = await createAdminClient();
  const file = await storage.getFile(STORAGE_BUCKETS.RECEIPTS, params.fileId);

  const fileSizeGB = file.sizeOriginal / (1024 * 1024 * 1024);

  // Delete file
  await storage.deleteFile(STORAGE_BUCKETS.RECEIPTS, params.fileId);

  // Decrement storage usage
  await decrementStorageUsage(user.$id, fileSizeGB);

  return NextResponse.json({ success: true });
}
```

---

## 3. Bank Connections Tracking

### Counting Plaid Institutions

**What We Track:**
- Total number of unique Plaid institution connections
- Stored as `plaidItems` in Appwrite

**Current Schema:**
```typescript
// plaidItems collection
{
  userId: string;
  itemId: string;           // Plaid item ID
  institutionId: string;    // Institution identifier
  institutionName: string;  // "Chase", "Bank of America", etc.
  accessToken: string;      // Encrypted
}
```

### Implementation Strategy

**Option A: Count plaidItems (Recommended)**
- Query all plaidItems for a user
- Count total documents
- Simple, accurate

**Option B: Maintain Counter**
- Store count in subscription record
- Update on connect/disconnect
- Faster queries but need to sync

**Recommendation: Option A (Count plaidItems)**
- Source of truth is plaidItems collection
- No sync issues
- Simple query

### Tracking Implementation

**Count current connections:**
```typescript
async function countBankConnections(userId: string): Promise<number> {
  const { databases } = await createAdminClient();

  const items = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PLAID_ITEMS,
    [Query.equal('userId', userId)]
  );

  return items.total;
}
```

**Check limit before allowing new connection:**
```typescript
// app/api/plaid/exchange-token/route.ts
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  // Check current connections
  const currentConnections = await countBankConnections(user.$id);
  const { subscription } = await checkSubscriptionAccess();

  if (currentConnections >= subscription.maxBanks) {
    return NextResponse.json(
      { error: 'Bank connection limit reached. Please upgrade your plan.' },
      { status: 429 }
    );
  }

  // Exchange token and create plaidItem
  // ...
}
```

**Sync count to subscription record (optional):**
```typescript
// Update subscription with current count
async function syncBankConnectionCount(userId: string) {
  const count = await countBankConnections(userId);

  const { databases } = await createAdminClient();
  const subs = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    [Query.equal('userId', userId)]
  );

  if (subs.documents.length > 0) {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      subs.documents[0].$id,
      { currentBanksConnected: count }
    );
  }
}
```

---

## Summary: Where to Track Each Metric

| Metric | Source of Truth | Tracking Method | Update Frequency |
|--------|----------------|-----------------|------------------|
| **Chat Messages** | `subscriptions.currentChatsUsed` | Increment on each chat API call | Every message |
| **Storage** | `subscriptions.currentStorageUsedGB` | Increment on upload, decrement on delete | Every file operation |
| **Bank Connections** | Count of `plaidItems` collection | Query count, optional sync to subscription | On connect/disconnect |

---

## Implementation Checklist

### LLM Token Usage
- [ ] Add `currentChatsUsed` field to subscriptions collection
- [ ] Add `chatUsageResetDate` field to subscriptions collection
- [ ] Update `app/api/chat/route.ts` to check limit before processing
- [ ] Implement `incrementChatUsage()` function
- [ ] Implement monthly reset logic
- [ ] Add usage display in UI (e.g., "45 / 100 messages used")

### Storage Usage
- [ ] Add `currentStorageUsedGB` field to subscriptions collection
- [ ] Update `app/api/files/upload/route.ts` to check limit
- [ ] Implement `incrementStorageUsage()` function
- [ ] Update `app/api/files/[fileId]/route.ts` DELETE to decrement
- [ ] Add usage display in UI (e.g., "2.3 GB / 10 GB used")

### Bank Connections
- [ ] Implement `countBankConnections()` helper
- [ ] Update `app/api/plaid/exchange-token/route.ts` to check limit
- [ ] Optional: Sync count to `currentBanksConnected` field
- [ ] Add usage display in UI (e.g., "2 / 3 banks connected")

### Subscription Collection Updates
- [ ] Update Appwrite collection schema with new fields
- [ ] Run migration to add fields to existing subscriptions
- [ ] Update Stripe webhook to initialize usage counters
- [ ] Update subscription-check.ts to include usage data

---

## Testing Strategy

1. **Test LLM Limit:**
   - Set limit to 3 messages
   - Send 3 messages → should work
   - Send 4th message → should get 429 error

2. **Test Storage Limit:**
   - Set limit to 0.001 GB (1 MB)
   - Upload 500 KB file → should work
   - Upload another 600 KB file → should get 429 error
   - Delete first file → should free up space

3. **Test Bank Limit:**
   - Set limit to 2 banks
   - Connect 2 banks → should work
   - Try to connect 3rd bank → should get 429 error

---

## UI/UX Considerations

### Display Usage in Dashboard

**Location:** Dashboard widgets or settings page

```typescript
// components/usage-widget.tsx
export function UsageWidget({ subscription }) {
  const chatPercent = (subscription.currentChatsUsed / subscription.maxChatsPerMonth) * 100;
  const storagePercent = (subscription.currentStorageUsedGB / subscription.maxStorageGB) * 100;
  const banksPercent = (subscription.currentBanksConnected / subscription.maxBanks) * 100;

  return (
    <div className="border rounded-lg p-6">
      <h3 className="font-medium mb-4">Usage This Month</h3>

      <div className="space-y-4">
        {/* Chat Messages */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">AI Chat Messages</span>
            <span className="text-sm font-medium">
              {subscription.currentChatsUsed} / {subscription.maxChatsPerMonth}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-blue-600 rounded-full"
              style={{ width: `${chatPercent}%` }}
            />
          </div>
        </div>

        {/* Storage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">Storage</span>
            <span className="text-sm font-medium">
              {subscription.currentStorageUsedGB.toFixed(2)} GB / {subscription.maxStorageGB} GB
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-green-600 rounded-full"
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>

        {/* Bank Connections */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm">Bank Connections</span>
            <span className="text-sm font-medium">
              {subscription.currentBanksConnected} / {subscription.maxBanks}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-2 bg-purple-600 rounded-full"
              style={{ width: `${banksPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Warning if approaching limit */}
      {(chatPercent > 80 || storagePercent > 80 || banksPercent > 80) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            You're approaching your plan limits. Consider upgrading.
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## Next Steps

1. Review this plan
2. Decide on tracking granularity (messages vs tokens, etc.)
3. Update Appwrite subscriptions collection schema
4. Implement tracking in API routes
5. Add usage display to UI
6. Test with real usage scenarios

