# Appwrite Subscriptions Collection Schema

**Collection Name:** `subscriptions`

**Collection ID:** (will be generated when created)

## Purpose
Stores user subscription information for Koffers billing, including base subscription and any add-ons.

## Attributes

### Core Subscription Fields
| Attribute | Type | Size | Required | Description |
|-----------|------|------|----------|-------------|
| `userId` | string | 36 | Yes | Appwrite user ID (links to users) |
| `stripeCustomerId` | string | 255 | Yes | Stripe customer ID |
| `stripeSubscriptionId` | string | 255 | Yes | Stripe subscription ID |
| `status` | string | 50 | Yes | active, canceled, past_due, trialing |
| `currentPeriodEnd` | datetime | - | Yes | When subscription renews/ends |
| `cancelAtPeriodEnd` | boolean | - | Yes | True if user canceled |
| `createdAt` | datetime | - | Yes | When subscription was created |
| `updatedAt` | datetime | - | Yes | Last update timestamp |

### Base Plan Fields
| Attribute | Type | Size | Required | Description |
|-----------|------|----------|----------|-------------|
| `basePlan` | boolean | - | Yes | Always true (everyone has base) |
| `basePlanPriceId` | string | 255 | Yes | Stripe price ID for base ($21/year) |

### Add-On Tracking
| Attribute | Type | Size | Required | Description |
|-----------|------|----------|----------|-------------|
| `addonBanks` | integer | - | Yes | Number of +3 bank add-ons (0, 1, 2, 3...) |
| `addonChats` | integer | - | Yes | Number of +100 chat add-ons (0, 1, 2, 3...) |
| `addonStorage` | integer | - | Yes | Number of +10GB storage add-ons (0, 1, 2, 3...) |

### Calculated Limits (from add-ons)
| Attribute | Type | Size | Required | Description |
|-----------|------|----------|----------|-------------|
| `maxBanks` | integer | - | Yes | 3 + (addonBanks × 3) |
| `maxChatsPerMonth` | integer | - | Yes | 100 + (addonChats × 100) |
| `maxStorageGB` | integer | - | Yes | 5 + (addonStorage × 10) |

### Usage Tracking (Current Period)
| Attribute | Type | Size | Required | Description |
|-----------|------|----------|----------|-------------|
| `currentBanksConnected` | integer | - | Yes | Current number of banks connected |
| `currentChatsUsed` | integer | - | Yes | Chats used this month |
| `currentStorageUsedGB` | float | - | Yes | Storage used in GB |
| `usageResetAt` | datetime | - | Yes | When monthly usage counters reset |

## Indexes

Create these indexes for efficient queries:

| Index Name | Type | Attribute | Order |
|------------|------|-----------|-------|
| userId | Key | userId | ASC |
| stripeCustomerId | Key | stripeCustomerId | ASC |
| stripeSubscriptionId | Key | stripeSubscriptionId | ASC |
| status | Fulltext | status | ASC |
| createdAt | Key | $createdAt | DESC |

## Permissions

### Read
- **Users (read their own):** `read("user:{userId}")`
- Users can only read their own subscription

### Create
- **Server only:** No user creation permission
- Created via webhook handler with API key

### Update
- **Server only:** `update("any")`
- Updated via webhook handler with API key
- Users cannot directly update subscriptions

### Delete
- **Server only:** No user deletion permission
- Deletion happens via webhook on subscription delete

## Example Document

```json
{
  "$id": "subscription_abc123",
  "$createdAt": "2025-01-01T00:00:00.000Z",
  "$updatedAt": "2025-06-15T14:30:00.000Z",
  "userId": "user_xyz789",
  "stripeCustomerId": "cus_ABC123XYZ",
  "stripeSubscriptionId": "sub_DEF456UVW",
  "status": "active",
  "currentPeriodEnd": "2026-01-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "basePlan": true,
  "basePlanPriceId": "price_BASE_SUBSCRIPTION",
  "addonBanks": 1,
  "addonChats": 2,
  "addonStorage": 0,
  "maxBanks": 6,
  "maxChatsPerMonth": 300,
  "maxStorageGB": 5,
  "currentBanksConnected": 4,
  "currentChatsUsed": 127,
  "currentStorageUsedGB": 2.3,
  "usageResetAt": "2025-07-01T00:00:00.000Z",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-06-15T14:30:00.000Z"
}
```

## Subscription Lifecycle

### 1. New Subscription (Checkout Complete)
When `checkout.session.completed` webhook fires:
```
- Create subscription document
- Set basePlan = true
- Set all addon counts to 0
- Calculate initial maxBanks/maxChats/maxStorage
- Set usageResetAt to next month
```

### 2. Add Add-On (Subscription Updated)
When `customer.subscription.updated` webhook fires:
```
- Increment appropriate addon counter (addonBanks, addonChats, addonStorage)
- Recalculate maxBanks/maxChats/maxStorage
- Update updatedAt
```

### 3. Monthly Usage Reset
Cron job runs daily:
```
- Check if usageResetAt < now
- If yes: reset currentChatsUsed to 0
- Set usageResetAt to next month
- Note: currentBanksConnected and currentStorageUsedGB don't reset
```

### 4. Usage Increment
When user performs action:
```
- Connect bank: currentBanksConnected++
- Send chat: currentChatsUsed++
- Upload file: currentStorageUsedGB += fileSize
- Check against limits before allowing action
```

### 5. Subscription Canceled
When `customer.subscription.deleted` webhook fires:
```
- Set status = "canceled"
- Set cancelAtPeriodEnd = true
- Keep access until currentPeriodEnd
- After currentPeriodEnd: downgrade to free tier or lock account
```

## Usage Enforcement Logic

```typescript
// Before allowing user to connect a bank
if (subscription.currentBanksConnected >= subscription.maxBanks) {
  // Show upgrade modal
  return "You've reached your bank limit. Add +3 banks for $10/year?";
}

// Before allowing user to send a chat
if (subscription.currentChatsUsed >= subscription.maxChatsPerMonth) {
  // Show upgrade modal
  return "You've used 100 chats this month. Add +100/month for $8/year?";
}

// Before allowing file upload
const newTotal = subscription.currentStorageUsedGB + fileSizeGB;
if (newTotal > subscription.maxStorageGB) {
  // Show upgrade modal
  return "You're out of storage. Add +10GB for $5/year?";
}
```

## Creating the Collection in Appwrite

1. Go to Appwrite Console → Database → Create Collection
2. Name: `subscriptions`
3. Add all attributes listed above
4. Create all indexes listed above
5. Set permissions as specified
6. Test with a dummy document

## Migration Notes

If you need to update the schema later:
- Add new attributes with default values
- Create new indexes
- Run migration script to update existing documents
- Do NOT change attribute types (recreate instead)
