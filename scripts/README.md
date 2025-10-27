# Database Setup Scripts

## Plaid Bank Collections Setup

This script creates the necessary Appwrite database collections for Plaid bank integration.

### Prerequisites

1. **Appwrite API Key**: You need a server-side API key with full database permissions
   - Go to Appwrite Console → Settings → API Keys
   - Create a new API key named "Database Setup"
   - Grant scopes: `databases.read`, `databases.write`, `collections.read`, `collections.write`, `attributes.read`, `attributes.write`, `indexes.read`, `indexes.write`
   - Copy the key

2. **Environment Variables**: Add to `.env.local`:

```bash
# Appwrite (existing)
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_DATABASE_ID=koffers_db

# Server-side API key (for setup scripts only)
APPWRITE_API_KEY=your_server_api_key
```

3. **Install Dependencies**:

```bash
npm install --save-dev node-appwrite tsx
```

### Running the Setup

```bash
npx tsx scripts/setup-bank-collections.ts
```

### What It Creates

#### 1. bank_connections Collection

Stores Plaid connection metadata and access tokens.

**Attributes:**
- `team_id` (string) - Foreign key to team
- `institution_id` (string) - Plaid institution ID
- `item_id` (string) - Plaid item ID (unique)
- `access_token` (string) - Encrypted Plaid access token
- `status` (enum) - 'active' | 'error' | 'disconnected'
- `error_code` (string, optional) - Plaid error code
- `created_at` (datetime)
- `updated_at` (datetime)

**Indexes:**
- `team_id_idx` - For querying user's connections
- `item_id_idx` - Unique index for Plaid item
- `status_idx` - For filtering by connection status

#### 2. bank_accounts Collection

Stores individual bank accounts from Plaid connections.

**Attributes:**
- `connection_id` (string) - Foreign key to bank_connections
- `team_id` (string) - Foreign key to team
- `account_id` (string) - Plaid account ID (unique)
- `name` (string) - Account name from bank
- `mask` (string) - Last 4 digits
- `type` (string) - Account type (depository, credit, etc.)
- `subtype` (string) - Account subtype (checking, savings, etc.)
- `currency` (string) - ISO currency code
- `balance_available` (float, optional)
- `balance_current` (float, optional)
- `balance_limit` (float, optional)
- `enabled` (boolean) - Whether account sync is enabled
- `created_at` (datetime)
- `updated_at` (datetime)

**Indexes:**
- `team_id_idx` - For querying user's accounts
- `connection_id_idx` - For grouping by connection
- `account_id_idx` - Unique index for Plaid account
- `enabled_idx` - For filtering enabled accounts

### Output

The script will show progress as it creates collections, attributes, and indexes:

```
🚀 Starting Appwrite database setup for Plaid integration...
📍 Endpoint: https://cloud.appwrite.io/v1
📁 Project: your_project_id
💾 Database: koffers_db

📦 Creating bank_connections collection...
✅ Collection created: bank_connections

📝 Creating attributes...
  ✅ Created attribute: team_id
  ✅ Created attribute: institution_id
  ✅ Created attribute: item_id
  ...

🔍 Creating indexes...
  ✅ Created index: team_id_idx
  ...

✅ bank_connections collection setup complete!

📦 Creating bank_accounts collection...
...

🎉 All done! Database setup complete.
```

### Next Steps

After running this script:

1. ⏭️ Install Plaid packages (`npm install plaid react-plaid-link`)
2. ⏭️ Set up encryption for access tokens (see `docs/PLAID_SETUP_GUIDE.md`)
3. ⏭️ Create Plaid API routes
4. ⏭️ Implement frontend components

### Troubleshooting

**Error: APPWRITE_API_KEY is required**
- Make sure you've added the API key to `.env.local`
- Restart your terminal to reload environment variables

**Error: Insufficient permissions**
- Your API key needs full database permissions
- Create a new API key with all database-related scopes

**Error: Collection already exists**
- This is normal if you're re-running the script
- The script will skip existing collections and show "⏭️ Collection already exists"

### Security Notes

- The `APPWRITE_API_KEY` is a powerful server-side key
- Never commit it to version control
- Never expose it in client-side code
- Only use it for setup scripts and API routes
- Consider creating a separate API key specifically for database setup
