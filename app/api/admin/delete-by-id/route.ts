import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { requireAdmin } from '@/lib/auth-helpers';

/**
 * ADMIN ENDPOINT - Delete specific documents by ID
 * For cleaning up orphaned records
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin();

    const body = await request.json();
    const { accountIds, plaidItemIds, confirmDelete } = body;

    if (confirmDelete !== 'YES_DELETE_BY_ID') {
      return NextResponse.json(
        { error: 'confirmDelete="YES_DELETE_BY_ID" required' },
        { status: 400 }
      );
    }

    const results = {
      accountsDeleted: [] as string[],
      plaidItemsDeleted: [] as string[],
      errors: [] as string[],
    };

    // Delete accounts by ID
    if (accountIds && Array.isArray(accountIds)) {
      for (const accountId of accountIds) {
        try {
          await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.ACCOUNTS,
            accountId
          );
          results.accountsDeleted.push(accountId);
        } catch (err: any) {
          results.errors.push(`Failed to delete account ${accountId}: ${err.message}`);
        }
      }
    }

    // Delete Plaid items by ID
    if (plaidItemIds && Array.isArray(plaidItemIds)) {
      for (const itemId of plaidItemIds) {
        try {
          await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.PLAID_ITEMS,
            itemId
          );
          results.plaidItemsDeleted.push(itemId);
        } catch (err: any) {
          results.errors.push(`Failed to delete Plaid item ${itemId}: ${err.message}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Deletion completed',
      results,
    });
  } catch (error: any) {
    // Handle authentication errors
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      const status = error.message.includes('Forbidden') ? 403 : 401;
      return NextResponse.json({ error: error.message }, { status });
    }

    console.error('Error in delete-by-id:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete records' },
      { status: 500 }
    );
  }
}
