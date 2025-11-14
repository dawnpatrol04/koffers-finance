# Create Subscriptions Collection in Appwrite

## ⚠️ REQUIRED SETUP

The billing page is failing because the `subscriptions` collection doesn't exist in Appwrite yet.

## Steps to Create Collection

### 1. Go to Appwrite Console
Navigate to: https://cloud.appwrite.io/console/project-68feda5ccfd37b41c05a/databases/database-koffers_poc

### 2. Create New Collection
- Click "Create Collection"
- **Collection ID**: `subscriptions`
- **Collection Name**: `Subscriptions`

### 3. Add Attributes

Click "Add Attribute" for each field below:

#### String Attributes
1. **userId** (String, required)
   - Size: 255
   - Required: Yes

2. **status** (String, required)
   - Size: 50
   - Required: Yes
   - Default: "active"

3. **currentPeriodEnd** (String, optional)
   - Size: 50
   - Required: No

4. **stripeCustomerId** (String, optional)
   - Size: 255
   - Required: No

5. **stripeSubscriptionId** (String, optional)
   - Size: 255
   - Required: No

#### Integer Attributes
6. **maxBanks** (Integer, required)
   - Min: 0
   - Max: 1000
   - Required: Yes
   - Default: 3

7. **maxChatsPerMonth** (Integer, required)
   - Min: 0
   - Max: 1000000
   - Required: Yes
   - Default: 100

8. **maxStorageGB** (Integer, required)
   - Min: 0
   - Max: 10000
   - Required: Yes
   - Default: 5

9. **currentBanksConnected** (Integer, required)
   - Min: 0
   - Max: 1000
   - Required: Yes
   - Default: 0

10. **currentChatsUsed** (Integer, required)
    - Min: 0
    - Max: 1000000
    - Required: Yes
    - Default: 0

11. **currentStorageUsedGB** (Integer, required)
    - Min: 0
    - Max: 10000
    - Required: Yes
    - Default: 0

12. **addonBanks** (Integer, required)
    - Min: 0
    - Max: 1000
    - Required: Yes
    - Default: 0

13. **addonChats** (Integer, required)
    - Min: 0
    - Max: 1000000
    - Required: Yes
    - Default: 0

14. **addonStorage** (Integer, required)
    - Min: 0
    - Max: 10000
    - Required: Yes
    - Default: 0

### 4. Create Indexes

Create these indexes for performance:

1. **userId_index**
   - Type: Key
   - Attribute: userId
   - Order: ASC

2. **status_index**
   - Type: Key
   - Attribute: status
   - Order: ASC

### 5. Set Permissions

Go to Settings → Permissions:

**Document Security**: Enabled (recommended)

**Collection Permissions:**
- Read: `users` (any authenticated user can read their own)
- Create: `users` (users can create subscriptions)
- Update: `users` (users can update their subscriptions)
- Delete: None (only admins via API key)

**Document-level permissions will be set by the API when creating docs**

## Verification

After creating the collection:

1. Refresh https://koffers.ai/dashboard/settings/billing
2. The billing page should now load without errors
3. The "Subscribe to Koffers Pro" button should work
4. Clicking it will redirect to Stripe Checkout

## Next Step After This

Once the collection is created and the billing page loads:
- Test the subscribe button → should redirect to Stripe Checkout
- Complete payment in Stripe test mode
- Verify webhook creates subscription document in Appwrite
