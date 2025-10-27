# Plaid API Integration Setup Guide

## Overview

This guide documents the complete setup and integration process for Plaid API in the Koffers Finance application. Plaid provides secure bank account connectivity and transaction data aggregation.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Environment Variables](#environment-variables)
3. [Required Packages](#required-packages)
4. [Plaid Integration Flow](#plaid-integration-flow)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Security Considerations](#security-considerations)
8. [Testing in Sandbox](#testing-in-sandbox)

---

## Getting Started

### 1. Create Plaid Developer Account

1. Visit [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
2. Complete the signup process
3. Verify your email address
4. Access the Plaid Dashboard

### 2. Get API Credentials

From the Plaid Dashboard:

1. Navigate to **Team Settings** → **Keys**
2. Copy your **client_id** (same for all environments)
3. Copy your **Sandbox secret** (for development)
4. Later, when ready for production, request **Development** and **Production** secrets

### 3. Understand Plaid Environments

| Environment | Purpose | Credentials | Cost |
|-------------|---------|-------------|------|
| **Sandbox** | Testing with fake data | Free | $0 |
| **Development** | Testing with real bank connections (limited to 100 items) | Free for first 100 | $0 |
| **Production** | Live application with real users | Paid per API call | Variable |

---

## Environment Variables

Add the following to your `.env.local` file:

```bash
# Plaid API Credentials
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_sandbox_secret_here
NEXT_PUBLIC_PLAID_ENVIRONMENT=sandbox

# Appwrite (existing)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
```

### Environment Variable Details

- **PLAID_CLIENT_ID**: Your Plaid client ID (same across all environments)
- **PLAID_SECRET**: Your environment-specific secret key (keep server-side only)
- **NEXT_PUBLIC_PLAID_ENVIRONMENT**: Set to `sandbox`, `development`, or `production`

> **Security Note**: `PLAID_SECRET` must NEVER be exposed to the client. Only `NEXT_PUBLIC_PLAID_ENVIRONMENT` is safe to expose.

---

## Required Packages

### NPM Dependencies

```bash
npm install plaid react-plaid-link
```

### Package Details

**plaid** (v13.x or latest)
- Official Plaid Node.js SDK
- Server-side API client
- Used in API routes for token exchange, fetching accounts, and transactions

**react-plaid-link** (v4.x or latest)
- Official React component for Plaid Link
- Client-side OAuth-like modal for bank authentication
- Handles the entire bank connection flow

### TypeScript Types

Both packages include TypeScript definitions out of the box.

---

## Plaid Integration Flow

### Complete Flow Diagram

```
┌─────────────┐
│   User      │
│   Clicks    │──┐
│  "Connect"  │  │
└─────────────┘  │
                 ▼
┌──────────────────────────────────────┐
│  1. Frontend calls API:              │
│     POST /api/plaid/create-link-token│
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  2. Server calls Plaid API:          │
│     plaidClient.linkTokenCreate()    │
│     Returns: link_token (ephemeral)  │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  3. Frontend opens Plaid Link modal  │
│     usePlaidLink({ token })          │
│     User selects bank and logs in    │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  4. Plaid returns public_token       │
│     (ephemeral, single-use)          │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  5. Frontend calls API:              │
│     POST /api/plaid/exchange-token   │
│     Body: { publicToken }            │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  6. Server calls Plaid API:          │
│     itemPublicTokenExchange()        │
│     Returns: access_token, item_id   │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  7. Server stores in Appwrite:       │
│     - access_token (encrypted)       │
│     - item_id                        │
│     - institution_id                 │
│     - team_id                        │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  8. Fetch accounts from Plaid:       │
│     plaidClient.accountsGet()        │
│     Returns: account list            │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  9. User selects accounts to sync    │
│     Store in Appwrite:               │
│     - bank_accounts collection       │
└──────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  10. Ongoing transaction sync        │
│      Webhook: /api/webhook/plaid     │
│      Or periodic polling             │
└──────────────────────────────────────┘
```

### Token Lifecycle

| Token Type | Lifespan | Purpose | Storage |
|------------|----------|---------|---------|
| **link_token** | 4 hours | Initialize Plaid Link modal | Temporary (React state) |
| **public_token** | 30 minutes | Single-use exchange token | Never stored |
| **access_token** | Permanent* | Access account data | Database (encrypted) |

*Access tokens can be revoked by users or expire if not used for 90 days

---

## API Endpoints

### 1. Create Link Token

**Endpoint**: `POST /api/plaid/create-link-token`

**Purpose**: Generate a temporary token to initialize Plaid Link

**Request Body**:
```typescript
{
  userId: string;      // Current user's ID
  accessToken?: string; // Optional: for reconnection/update flow
}
```

**Response**:
```typescript
{
  linkToken: string;
  expiration: string; // ISO 8601 timestamp
}
```

**Implementation** (based on Midday):
```typescript
// app/api/plaid/create-link-token/route.ts
import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments, Products } from 'plaid';

export async function POST(req: Request) {
  const { userId, accessToken } = await req.json();

  const configuration = new Configuration({
    basePath: PlaidEnvironments[process.env.NEXT_PUBLIC_PLAID_ENVIRONMENT || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
        'PLAID-SECRET': process.env.PLAID_SECRET!,
      },
    },
  });

  const plaidClient = new PlaidApi(configuration);

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Koffers',
      products: [Products.Transactions],
      country_codes: ['US', 'CA', 'GB', 'DE', 'FR'], // Adjust based on your needs
      language: 'en',
      access_token: accessToken, // For update/reconnect mode
      webhook: `${process.env.NEXT_PUBLIC_URL}/api/webhook/plaid`,
      transactions: {
        days_requested: 730, // 2 years of history
      },
    });

    return NextResponse.json({
      linkToken: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error('Create link token error:', error);
    return NextResponse.json(
      { error: 'Failed to create link token' },
      { status: 500 }
    );
  }
}
```

### 2. Exchange Public Token

**Endpoint**: `POST /api/plaid/exchange-token`

**Purpose**: Exchange public_token for access_token and save to database

**Request Body**:
```typescript
{
  publicToken: string;
  institutionId: string;
  teamId: string;
}
```

**Response**:
```typescript
{
  accessToken: string; // For frontend to immediately fetch accounts
  itemId: string;
  connectionId: string; // Appwrite document ID
}
```

**Implementation**:
```typescript
// app/api/plaid/exchange-token/route.ts
import { NextResponse } from 'next/server';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { databases } from '@/lib/appwrite-server';
import { ID } from 'appwrite';

export async function POST(req: Request) {
  const { publicToken, institutionId, teamId } = await req.json();

  const configuration = new Configuration({
    basePath: PlaidEnvironments[process.env.NEXT_PUBLIC_PLAID_ENVIRONMENT || 'sandbox'],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
        'PLAID-SECRET': process.env.PLAID_SECRET!,
      },
    },
  });

  const plaidClient = new PlaidApi(configuration);

  try {
    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const { access_token, item_id } = exchangeResponse.data;

    // Save to Appwrite
    const connection = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      'bank_connections',
      ID.unique(),
      {
        team_id: teamId,
        institution_id: institutionId,
        access_token: access_token, // TODO: Encrypt this!
        item_id: item_id,
        status: 'active',
        created_at: new Date().toISOString(),
      }
    );

    return NextResponse.json({
      accessToken: access_token,
      itemId: item_id,
      connectionId: connection.$id,
    });
  } catch (error) {
    console.error('Exchange token error:', error);
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
```

### 3. Fetch Accounts

**Endpoint**: `POST /api/plaid/get-accounts`

**Purpose**: Retrieve list of accounts from Plaid for user selection

**Request Body**:
```typescript
{
  accessToken: string;
  institutionId: string;
}
```

**Response**:
```typescript
{
  accounts: Array<{
    account_id: string;
    name: string;
    mask: string; // Last 4 digits
    type: string; // 'depository', 'credit', 'loan', etc.
    subtype: string; // 'checking', 'savings', 'credit card', etc.
    balances: {
      available: number | null;
      current: number | null;
      limit: number | null;
      iso_currency_code: string;
    };
  }>;
}
```

### 4. Webhook Handler

**Endpoint**: `POST /api/webhook/plaid`

**Purpose**: Receive real-time updates from Plaid

**Common Webhook Types**:
- `TRANSACTIONS_REMOVED`: Transactions were deleted
- `DEFAULT_UPDATE`: New transactions available
- `INITIAL_UPDATE`: Initial historical transactions ready
- `HISTORICAL_UPDATE`: Additional historical transactions ready
- `ITEM_ERROR`: Connection issue with institution

---

## Database Schema

### Appwrite Collections

#### 1. bank_connections

Stores Plaid connection metadata and access tokens.

```typescript
{
  $id: string;                    // Auto-generated
  team_id: string;                // Foreign key to team
  institution_id: string;         // Plaid institution ID
  item_id: string;                // Plaid item ID
  access_token: string;           // ENCRYPT THIS! Plaid access token
  status: 'active' | 'error' | 'disconnected';
  error_code?: string;            // Plaid error code if status = 'error'
  created_at: string;             // ISO 8601
  updated_at: string;             // ISO 8601
}
```

**Indexes**:
- `team_id` (for querying user's connections)
- `item_id` (for webhook lookups)
- `status` (for filtering active connections)

**Permissions**:
- Read: User must be team member
- Create: User must be team member
- Update: User must be team member
- Delete: User must be team member

#### 2. bank_accounts

Stores individual accounts from each connection.

```typescript
{
  $id: string;                    // Auto-generated
  connection_id: string;          // Foreign key to bank_connections
  team_id: string;                // Foreign key to team
  account_id: string;             // Plaid account ID
  name: string;                   // Account name from bank
  mask: string;                   // Last 4 digits
  type: string;                   // Account type
  subtype: string;                // Account subtype
  currency: string;               // ISO currency code
  balance_available: number | null;
  balance_current: number | null;
  balance_limit: number | null;
  enabled: boolean;               // User can disable sync
  created_at: string;             // ISO 8601
  updated_at: string;             // ISO 8601
}
```

**Indexes**:
- `team_id` (for querying user's accounts)
- `connection_id` (for grouping by connection)
- `account_id` (for Plaid API calls)
- `enabled` (for filtering active accounts)

#### 3. transactions (future)

Stores synced transactions from Plaid.

```typescript
{
  $id: string;
  account_id: string;             // Foreign key to bank_accounts
  team_id: string;
  transaction_id: string;         // Plaid transaction ID
  date: string;                   // Transaction date
  name: string;                   // Merchant/description
  amount: number;                 // Always positive
  currency: string;
  category: string[];             // Plaid categories
  pending: boolean;
  // ... additional fields
}
```

---

## Security Considerations

### 1. Access Token Encryption

**CRITICAL**: Access tokens MUST be encrypted at rest.

```typescript
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  const [ivHex, authTagHex, encrypted] = text.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

Add to `.env.local`:
```bash
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your_64_character_hex_string
```

### 2. Server-Side Only

Never expose:
- `PLAID_SECRET`
- `access_token` values
- `ENCRYPTION_KEY`

These must ONLY be used in API routes (server-side).

### 3. Rate Limiting

Implement rate limiting on API endpoints:
- Link token creation: 10 requests/minute per user
- Token exchange: 5 requests/minute per user

### 4. Webhook Validation

Validate webhook requests from Plaid using signature verification (check Plaid docs for current method).

---

## Testing in Sandbox

### Sandbox Credentials

When testing bank connections in Sandbox mode, use these credentials:

**Username**: `user_good`
**Password**: `pass_good`

This provides a standard set of accounts with sample transactions.

### Other Test Credentials

| Username | Password | Purpose |
|----------|----------|---------|
| `user_good` | `pass_good` | Success case with transactions |
| `user_bank_income` | `{}` | For testing income/employment data |
| `user_custom` | `pass_good` | Allows customization |

### Sample Institutions

In Sandbox, search for these test banks:
- First Platypus Bank
- Tartan Bank
- Houndstooth Bank

### Testing Webhooks

Use a tool like [ngrok](https://ngrok.com/) to expose your local server for webhook testing:

```bash
ngrok http 3000
```

Then update your webhook URL in Plaid API calls to the ngrok URL.

---

## Migration from Sandbox to Production

### Step 1: Request Production Access

1. Complete Plaid's production enablement form
2. Provide business information and use case
3. Wait for approval (can take 1-2 weeks)

### Step 2: Update Environment Variables

```bash
# Production
PLAID_SECRET=your_production_secret
NEXT_PUBLIC_PLAID_ENVIRONMENT=production
```

### Step 3: Update Webhook URLs

Change webhook URLs from staging to production:
- Sandbox: `https://staging.yourdomain.com/api/webhook/plaid`
- Production: `https://yourdomain.com/api/webhook/plaid`

### Step 4: Compliance

Ensure your app meets Plaid's requirements:
- Privacy policy
- Terms of service
- Data security measures
- User data deletion capabilities

---

## Additional Resources

- [Plaid Quickstart Guide](https://plaid.com/docs/quickstart/)
- [Plaid API Reference](https://plaid.com/docs/api/)
- [React Plaid Link Docs](https://plaid.com/docs/link/react/)
- [Plaid Sandbox Guide](https://plaid.com/docs/sandbox/)
- [Midday Implementation Reference](https://github.com/midday-ai/midday)

---

## Next Steps

1. ✅ Research complete (this document)
2. ⏭️ Create Appwrite database collections
3. ⏭️ Install packages and configure environment
4. ⏭️ Implement API routes
5. ⏭️ Copy Midday components
6. ⏭️ Test complete flow in Sandbox
