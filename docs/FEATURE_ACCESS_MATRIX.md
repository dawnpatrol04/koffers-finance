# Feature Access Control Matrix

**Last Updated**: November 15, 2025
**Purpose**: Visual reference for what features are available in each subscription state

---

## 📊 Access Control Matrix

### Legend
- ✅ **Full Access** - Feature works normally
- 🟡 **Limited Access** - Feature works with restrictions
- 🔒 **Read-Only** - Can view but not modify
- ❌ **Blocked** - Feature completely disabled
- 🎭 **Demo Data** - Uses fake data only

---

## Complete Feature Matrix

| Feature | Demo User | Active Subscriber | Past Due (Days 0-7) | Expired/Locked |
|---------|-----------|-------------------|---------------------|----------------|
| **🏦 Bank Connections** | | | | |
| View Bank Accounts | 🎭 Demo accounts only | ✅ Real accounts | ✅ Real accounts | 🔒 View only (no refresh) |
| Connect New Bank (Plaid) | ❌ Blocked ("Subscribe to connect") | 🟡 Limited by `maxBanks` | ✅ Can connect | ❌ Blocked (Plaid disconnected) |
| Refresh Bank Data | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked (Plaid disconnected) |
| Disconnect Bank | ❌ N/A (no real banks) | ✅ Full access | ✅ Full access | 🔒 View only |
| **Active Plaid Items** | 0 (none) | Count ≤ `maxBanks` | Full access | **AUTO-DISCONNECTED** ⚠️ |
| | | | | |
| **💰 Transactions** | | | | |
| View Transactions | 🎭 Demo data (90 days) | ✅ Real data | ✅ Real data | 🔒 Read-only |
| Create Manual Transaction | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| Edit Transaction | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| Delete Transaction | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| Categorize Transaction | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| Filter/Search Transactions | 🎭 Demo data | ✅ Full access | ✅ Full access | 🔒 Read-only |
| Export Transactions | ❌ Blocked | ✅ Full access | ✅ Full access | ✅ Can export real data |
| | | | | |
| **📄 Receipts & Files** | | | | |
| View Uploaded Files | 🎭 Demo receipts (5-10) | ✅ Real files | ✅ Real files | 🔒 Read-only |
| Upload New File | ❌ Blocked ("Subscribe to upload") | 🟡 Limited by `maxStorageGB` | ✅ Full access | ❌ Blocked |
| Delete File | ❌ N/A | ✅ Full access | ✅ Full access | ❌ Blocked |
| OCR Processing (Claude Vision) | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| Link Receipt to Transaction | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| **Total Storage Used** | 0 GB | Current ≤ `maxStorageGB` | Current usage | Frozen (no new uploads) |
| | | | | |
| **💬 LLM Chat (AI Assistant)** | | | | |
| Access Chat Interface | ✅ Limited (30 messages) | ✅ Full access | ✅ Full access | ❌ Blocked |
| Send Messages | 🟡 30 messages max (lifetime) | 🟡 Limited by `maxChatsPerMonth` | ✅ Full access | ❌ Blocked |
| Query Demo Data | ✅ Can ask about app features | ❌ No demo data | ❌ No demo data | ❌ Blocked |
| Query Real Data | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| **Chat Messages Used** | Count ≤ 30 (lifetime) | Count ≤ `maxChatsPerMonth` | Full access | N/A |
| **Monthly Reset** | Never (lifetime limit) | Resets on billing cycle | N/A | N/A |
| | | | | |
| **🔌 MCP Server Access** | | | | |
| Create API Keys | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| Use Existing API Keys | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked (keys revoked) |
| MCP Tools Available | 0 tools | All 10 tools | All 10 tools | **0 tools (API keys disabled)** |
| Claude Desktop Integration | ❌ Not available | ✅ Full access | ✅ Full access | ❌ Disabled |
| | | | | |
| **📊 Dashboard & Analytics** | | | | |
| View Dashboard | 🎭 Demo charts/graphs | ✅ Real data charts | ✅ Real data charts | 🔒 Static view (no refresh) |
| Cash Flow Widget | 🎭 Demo trends | ✅ Real trends | ✅ Real trends | 🔒 Last known data |
| Net Worth Widget | 🎭 Demo balance | ✅ Real balance | ✅ Real balance | 🔒 Last known data |
| Spending by Category | 🎭 Demo breakdown | ✅ Real breakdown | ✅ Real breakdown | 🔒 Last known data |
| Recent Transactions | 🎭 Demo list | ✅ Real list | ✅ Real list | 🔒 Read-only list |
| | | | | |
| **⚙️ Settings & Account** | | | | |
| View Settings Pages | ✅ Full access | ✅ Full access | ✅ Full access | ✅ Full access |
| Access Billing Page | ✅ Can subscribe | ✅ Manage subscription | 🟡 Update payment method | ✅ Can resubscribe |
| View Usage Metrics | N/A (no subscription) | ✅ See all usage | ✅ See all usage | 🔒 Last known usage |
| Manage API Keys | ❌ Blocked | ✅ Full access | ✅ Full access | ❌ Blocked |
| Change Email/Password | ✅ Full access | ✅ Full access | ✅ Full access | ✅ Full access |
| Delete Account | ✅ Full access | ✅ Full access | ✅ Full access | ✅ Full access |
| | | | | |
| **📤 Data Export** | | | | |
| Export Transactions (CSV) | ❌ Nothing to export | ✅ Full access | ✅ Full access | ✅ Can export |
| Export Transactions (JSON) | ❌ Nothing to export | ✅ Full access | ✅ Full access | ✅ Can export |
| Export Receipts (ZIP) | ❌ Nothing to export | ✅ Full access | ✅ Full access | ✅ Can export |
| Export All Data | ❌ Nothing to export | ✅ Full access | ✅ Full access | ✅ **Prominently displayed** |
| | | | | |
| **🚨 UI Indicators** | | | | |
| Banner | "Viewing demo data →" | None (or feature limits) | 🟡 "Payment failed, retry..." | 🔴 "Subscription ended" |
| Data Badge | "(Demo)" on all widgets | None | None | "Last updated: [date]" |
| Access Buttons | "Subscribe to unlock" | Normal CTA | Normal CTA | "Resubscribe to unlock" |
| Countdown Timer | None | None | "Next retry: [date]" | "Data deletion in: X days" |

---

## 📈 Usage Tracking Details

### 1. AI-SDK Token/Message Counting

**What We Track:**
```typescript
{
  // Option A: Message Count (RECOMMENDED)
  currentChatsUsed: number,        // Messages sent this month
  maxChatsPerMonth: number,        // Plan limit (e.g., 5000)
  chatUsageResetDate: string,      // Next billing cycle

  // Option B: Actual Tokens (optional, more precise)
  currentTokensUsed: number,       // Total tokens (prompt + completion)
  maxTokensPerMonth: number        // e.g., 1,000,000
}
```

**Implementation:**
```typescript
// app/api/chat/route.ts
const result = await streamText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  messages,
});

// After streaming completes:
const usage = result.usage;
// { promptTokens: 1234, completionTokens: 567, totalTokens: 1801 }

// Increment counter
await incrementChatUsage(user.$id, usage.totalTokens);
```

**Recommendation**: Track **message count** (easier for users to understand)

---

### 2. File Storage Tracking

**What We Track:**
```typescript
{
  currentStorageUsedGB: number,  // Total storage consumed
  maxStorageGB: number,          // Plan limit (e.g., 10 GB)
}
```

**When to Update:**
- ✅ **On Upload**: Add file size to total
- ✅ **On Delete**: Subtract file size from total

**Implementation:**
```typescript
// Upload
const fileSizeGB = file.size / (1024 * 1024 * 1024);
await incrementStorageUsage(userId, fileSizeGB);

// Delete
const { storage } = await createAdminClient();
const file = await storage.getFile(bucketId, fileId);
const fileSizeGB = file.sizeOriginal / (1024 * 1024 * 1024);
await decrementStorageUsage(userId, fileSizeGB);
```

---

### 3. Plaid Connection Counting

**What We Track:**
```typescript
{
  currentBanksConnected: number,  // Active Plaid Items
  maxBanks: number,              // Plan limit (e.g., 3)
}
```

**Source of Truth:** Count of `plaidItems` collection

**Implementation:**
```typescript
async function countBankConnections(userId: string): Promise<number> {
  const { databases } = await createAdminClient();
  const items = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.PLAID_ITEMS,
    [
      Query.equal('userId', userId),
      Query.isNull('disconnectedAt') // Only count active connections
    ]
  );
  return items.total;
}
```

**Note:** This is **critical for cost control**!
- Plaid charges ~$0.10/month per active Item
- Must disconnect Items when subscription ends
- Must enforce limits before allowing new connections

---

## 🔐 Access Control by Feature Type

### Category 1: Read Operations (Most Permissive)
**Features:** View transactions, view accounts, view dashboard, view files

**Access Rules:**
- ✅ Demo User: Can view demo data
- ✅ Active: Can view real data
- ✅ Past Due: Can view real data (grace period)
- ✅ Expired: Can view real data (read-only for export)

### Category 2: Write Operations (Requires Active Subscription)
**Features:** Create/edit transactions, upload files, connect banks

**Access Rules:**
- ❌ Demo User: Blocked ("Subscribe to unlock")
- ✅ Active: Allowed (with usage limits)
- ✅ Past Due: Allowed (grace period)
- ❌ Expired: Blocked

### Category 3: External Integrations (Strict Control)
**Features:** Plaid API calls, MCP server access

**Access Rules:**
- ❌ Demo User: Completely disabled
- ✅ Active: Full access (with limits)
- ✅ Past Due: Full access (grace period, but may end soon)
- ❌ Expired: **Auto-disabled/disconnected** ⚠️

**Why strict?** These cost us money even if user isn't using the app!

### Category 4: AI/LLM Features (Consumption-Based)
**Features:** Chat with AI assistant

**Access Rules:**
- 🟡 Demo User: 30 messages (lifetime) to explore app
- 🟡 Active: Limited by monthly quota
- ✅ Past Due: Full access (grace period)
- ❌ Expired: Completely disabled

**Why different?** Each message costs us money (Claude API)

### Category 5: Data Export (Always Available)
**Features:** Export to CSV, JSON, ZIP

**Access Rules:**
- ❌ Demo User: Nothing to export
- ✅ Active: Can export anytime
- ✅ Past Due: Can export anytime
- ✅ Expired: **Prominently encouraged** (before deletion)

**Why always available?** Legal/ethical obligation + builds trust

---

## 🎯 Key Implementation Rules

### Rule 1: Demo Users See Working App
```typescript
// ❌ DON'T show empty dashboard
<EmptyState>No transactions found. Connect a bank to get started.</EmptyState>

// ✅ DO show demo data
<TransactionsList transactions={user.isDemo ? DEMO_TRANSACTIONS : realTransactions} />
```

### Rule 2: Usage Limits Are Enforced Before Action
```typescript
// ❌ DON'T let them upload then reject
await storage.createFile(bucket, file); // Uploaded!
if (overLimit) throw new Error('Limit exceeded'); // Too late

// ✅ DO check limit first
if (currentStorage + fileSize > maxStorage) {
  throw new Error('Storage limit exceeded');
}
await storage.createFile(bucket, file); // Now upload
```

### Rule 3: Past Due = Grace Period (Be Nice!)
```typescript
// ❌ DON'T lock out immediately
if (subscription.status === 'past_due') {
  return 'blocked';
}

// ✅ DO give them 7 days
if (subscription.status === 'past_due') {
  return 'full_access'; // Stripe is retrying payments
}
```

### Rule 4: Expired = Auto-Disconnect Plaid (CRITICAL!)
```typescript
// When subscription ends or final retry fails:
async function handleSubscriptionExpired(userId: string) {
  // 1. Disconnect ALL Plaid Items (cost savings + compliance)
  await disconnectAllPlaidItems(userId);

  // 2. Disable MCP API keys
  await disableAllApiKeys(userId);

  // 3. Schedule data deletion (90 days)
  await scheduleDataDeletion(userId, 90);

  // 4. Send email with export instructions
  await sendSubscriptionEndedEmail(userId);
}
```

### Rule 5: MCP Access = Paid Users Only
```typescript
// Demo users NEVER get MCP access
if (user.subscriptionStatus === null) {
  // Redirect to billing page
  return { error: 'MCP requires active subscription' };
}

// Expired users have MCP disabled
if (subscription.status === 'canceled' && subscription.currentPeriodEnd < now) {
  // Revoke all API keys
  await revokeAllApiKeys(userId);
  return { error: 'Subscription expired. Resubscribe to restore MCP access.' };
}
```

---

## 🚀 Implementation Checklist

### Phase 1: Database Schema
- [ ] Add usage tracking fields to `subscriptions` collection:
  - `currentChatsUsed`
  - `chatUsageResetDate`
  - `currentStorageUsedGB`
  - `currentBanksConnected`
- [ ] Update TypeScript interfaces

### Phase 2: Usage Tracking Implementation
- [ ] Implement `incrementChatUsage()` in chat API
- [ ] Implement `incrementStorageUsage()` in file upload API
- [ ] Implement `decrementStorageUsage()` in file delete API
- [ ] Implement `countBankConnections()` helper
- [ ] Add limit checks before each action

### Phase 3: Access Control Guards
- [ ] Create `checkFeatureAccess(feature)` helper
- [ ] Add guards to all write operations
- [ ] Add guards to Plaid connect flow
- [ ] Add guards to MCP endpoint
- [ ] Add guards to chat API

### Phase 4: UI Updates
- [ ] Create `UsageMeter` component
- [ ] Create `FeatureLimitModal` component
- [ ] Add "Subscribe to unlock" buttons on demo mode
- [ ] Show usage meters in Settings
- [ ] Show warnings at 80% usage

### Phase 5: Demo Data System
- [ ] Create demo accounts seeder
- [ ] Create demo transactions seeder
- [ ] Create demo receipts seeder
- [ ] Update queries to use demo data when `isDemo = true`

---

## 📱 Mobile & Responsive Considerations

All access control must work identically on:
- Desktop web
- Mobile web
- (Future) Native mobile apps

**Key Points:**
- Demo mode banners must be visible but not intrusive on mobile
- Usage meters should be swipeable cards on mobile
- "Upgrade" CTAs should be thumb-friendly (44px minimum)
- Export functionality should work with mobile browsers

---

## 🔍 Testing Scenarios

### Scenario 1: Demo User Journey
1. User signs up
2. Sees demo dashboard populated with data
3. Tries to connect bank → blocked with "Subscribe to connect"
4. Asks LLM 10 questions about demo data → works
5. Asks 31st question → blocked with "Upgrade to continue"
6. Clicks upgrade → taken to billing page

### Scenario 2: Active User Hitting Limits
1. User with 3-bank plan has 3 banks connected
2. Tries to connect 4th bank → sees "Upgrade to add more banks"
3. User has used 4800/5000 chats
4. UI shows warning: "200 messages remaining this month"
5. User uses 5001st message → sees "Limit reached. Resets on [date] or upgrade now"

### Scenario 3: Payment Failure Recovery
1. User's card expires on Nov 15
2. Nov 15 10am: Payment fails → status = `past_due`
3. Nov 15 10:05am: User gets email "Payment failed, will retry tomorrow"
4. Nov 15-21: User continues using app normally (grace period)
5. Nov 16 10am: Stripe retries #1 → fails again
6. Nov 22 10am: Final retry → succeeds → status = `active` (no disruption!)

### Scenario 4: Subscription Cancellation
1. User cancels on Nov 15 (billing date is 1st of month)
2. Nov 15-30: Full access continues (they paid for November)
3. Nov 15-30: Banner shows "Subscription will end on Dec 1"
4. Dec 1 12:01am: Status changes to `expired`
5. Dec 1 12:02am: Auto-disconnect all Plaid Items
6. Dec 1 12:03am: Send email with export instructions
7. User can export data for 90 days, then permanent deletion

---

## 📚 Related Documentation

- `SUBSCRIPTION_ACCESS_CONTROL_v2.md` - Complete implementation guide
- `USAGE_METRICS_TRACKING.md` - Detailed tracking implementation
- `APPWRITE_OFFICIAL_RECOMMENDATION.md` - Server Component auth pattern

---

## ✅ Success Criteria

Feature access control is successful when:

1. **Demo users see value immediately** (populated dashboards, working LLM)
2. **Paid users hit clear limits** (with friendly upgrade prompts)
3. **Payment failures don't disrupt service** (7-day grace period)
4. **Expired subscriptions clean up automatically** (Plaid disconnects, data scheduled for deletion)
5. **We don't lose money** (MCP disabled, Plaid disconnected, storage enforced)
6. **Users can always export** (legal compliance, builds trust)
