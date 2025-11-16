# Appwrite Schema Migration - Token Tracking

## Overview

Add token tracking fields to the `subscriptions` collection to support accurate AI-SDK usage tracking and billing.

## Collection: subscriptions

### New Attributes to Add

**Via Appwrite Console:**

1. **currentTokensUsed** (integer)
   - Type: Integer
   - Required: No
   - Default: 0
   - Min: 0
   - Max: 999999999
   - Description: Total tokens used in current billing period

2. **lifetimeTokensUsed** (integer)
   - Type: Integer
   - Required: No
   - Default: 0
   - Min: 0
   - Max: 999999999
   - Description: All-time token usage for cost analysis

3. **lastTokenResetAt** (datetime)
   - Type: DateTime
   - Required: No
   - Default: null
   - Description: ISO timestamp of last monthly usage reset

4. **maxTokensPerMonth** (integer)
   - Type: Integer
   - Required: No
   - Default: 0
   - Min: 0
   - Max: 999999999
   - Description: Base plan token limit per month

5. **addonTokens** (integer)
   - Type: Integer
   - Required: No
   - Default: 0
   - Min: 0
   - Max: 999999999
   - Description: Additional tokens from add-ons

### Fields to Rename (Manual - Cannot be done via API)

These fields exist but should be conceptually renamed for clarity:
- `maxChatsPerMonth` → Actually represents `maxTokensPerMonth`
- `currentChatsUsed` → Actually represents `currentTokensUsed`
- `addonChats` → Actually represents `addonTokens`

**Note**: Since Appwrite doesn't support attribute renaming, we'll keep the old field names but update the code to use them for token tracking instead of message counting.

## Migration Steps

### Step 1: Add New Attributes in Appwrite Console

1. Go to Appwrite Console → Database → `koffers_db` → `subscriptions` collection
2. Click "Attributes" tab
3. Add each attribute listed above

### Step 2: Backfill Existing Records

Run this script to initialize new fields for existing subscriptions:

```typescript
// scripts/backfill-token-fields.ts
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function backfillTokenFields() {
  const DATABASE_ID = 'koffers_db';
  const COLLECTION_ID = 'subscriptions';

  // Get all subscriptions
  const subscriptions = await databases.listDocuments(
    DATABASE_ID,
    COLLECTION_ID
  );

  console.log(`Found ${subscriptions.total} subscriptions to update`);

  for (const sub of subscriptions.documents) {
    await databases.updateDocument(
      DATABASE_ID,
      COLLECTION_ID,
      sub.$id,
      {
        currentTokensUsed: 0,
        lifetimeTokensUsed: 0,
        lastTokenResetAt: new Date().toISOString(),
        maxTokensPerMonth: 50000, // Default Starter plan limit
        addonTokens: 0,
      }
    );

    console.log(`✓ Updated subscription ${sub.$id}`);
  }

  console.log('Migration complete!');
}

backfillTokenFields().catch(console.error);
```

### Step 3: Update Stripe Product Metadata

Update Stripe products to include token limits instead of message limits:

**Starter Plan** (`price_1STYb25pSNA06eeCCTBrN8Ic`)
- `max_tokens_per_month`: 50000
- `max_banks`: 3
- `max_storage_gb`: 5

**Pro Plan** (`price_1STYcn5pSNA06eeC4kZpqM0v`)
- `max_tokens_per_month`: 200000
- `max_banks`: 10
- `max_storage_gb`: 50

**Business Plan** (if exists)
- `max_tokens_per_month`: 1000000
- `max_banks`: 50
- `max_storage_gb`: 500

### Step 4: Update Stripe Webhook Handler

Update `/app/api/webhooks/stripe/route.ts` to write token limits to Appwrite:

```typescript
case 'customer.subscription.created':
case 'customer.subscription.updated': {
  // ...existing code...

  await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SUBSCRIPTIONS,
    ID.unique(),
    {
      userId: user.$id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),

      // Token limits from product metadata
      maxTokensPerMonth: parseInt(product.metadata.max_tokens_per_month || '50000'),
      maxBanks: parseInt(product.metadata.max_banks || '3'),
      maxStorageGB: parseFloat(product.metadata.max_storage_gb || '5'),

      // Initialize usage counters
      currentTokensUsed: 0,
      currentStorageUsedGB: 0,
      currentBanksConnected: 0,
      lifetimeTokensUsed: 0,
      lastTokenResetAt: new Date().toISOString(),

      // Add-ons (initialize to 0)
      addonTokens: 0,
      addonBanks: 0,
      addonStorage: 0,
    }
  );

  break;
}
```

## Verification

After migration, verify:

1. All existing subscriptions have `currentTokensUsed: 0`
2. All subscriptions have `maxTokensPerMonth` set based on their plan
3. Stripe products have correct token metadata
4. Webhook creates new subscriptions with token fields populated

## Rollback Plan

If issues occur:

1. Keep old fields (`maxChatsPerMonth`, etc.) intact
2. New fields can be deleted via Appwrite Console
3. Revert code changes to use old message-based tracking

## Testing

1. Create test subscription via Stripe
2. Verify Appwrite document has all token fields
3. Send chat message
4. Verify `currentTokensUsed` increments
5. Verify usage API returns correct stats
