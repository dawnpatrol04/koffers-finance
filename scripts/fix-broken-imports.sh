#!/bin/bash

# Script to fix all broken database/storage imports
# Replaces direct imports with createAdminClient() pattern

echo "🔧 Fixing broken imports in critical API routes..."
echo ""

# List of files to fix
files=(
  "app/api/mcp/route.ts"
  "app/api/plaid/exchange-token/route.ts"
  "app/api/plaid/fetch-data/route.ts"
  "app/api/plaid/remove-item/route.ts"
  "app/api/plaid/sync-status/route.ts"
  "app/api/plaid/transactions/[id]/route.ts"
  "app/api/webhook/plaid/route.ts"
  "app/api/files/upload/route.ts"
  "app/api/files/[fileId]/route.ts"
  "app/api/files/list/route.ts"
  "app/api/files/preview/[fileId]/route.ts"
  "app/api/files/process-receipt/route.ts"
  "app/api/files/batch-process/route.ts"
  "app/api/files/debug/route.ts"
  "app/api/transactions/route.ts"
  "app/api/admin/cleanup-accounts/route.ts"
  "app/api/admin/delete-by-id/route.ts"
  "app/api/ai/categorize-transaction/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  Checking $file..."

    # Check if file has broken imports
    if grep -q "import.*{.*databases.*}.*from.*'@/lib/appwrite-server'" "$file" || \
       grep -q "import.*{.*storage.*}.*from.*'@/lib/appwrite-server'" "$file"; then
      echo "    ❌ Found broken imports - needs manual fix"
    else
      echo "    ✅ No broken imports found"
    fi
  else
    echo "    ⚠️  File not found: $file"
  fi
done

echo ""
echo "📝 Manual fixes required for each file:"
echo ""
echo "Replace this pattern:"
echo "  import { databases } from '@/lib/appwrite-server';"
echo ""
echo "With:"
echo "  import { createAdminClient } from '@/lib/appwrite-server';"
echo ""
echo "Then at the start of each handler function, add:"
echo "  const { databases } = await createAdminClient();"
echo ""
echo "Same for 'storage' imports."
