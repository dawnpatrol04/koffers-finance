import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

/**
 * ADMIN ENDPOINT - Delete all accounts and Plaid items for cleanup
 * This is a temporary endpoint to clean up the database after the disconnect bug
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, confirmDelete } = body;

    if (!userId || confirmDelete !== 'YES_DELETE_EVERYTHING') {
      return NextResponse.json(
        { error: 'userId and confirmDelete="YES_DELETE_EVERYTHING" required' },
        { status: 400 }
      );
    }

    const results = {
      accountsDeleted: 0,
      plaidItemsDeleted: 0,
      transactionsDeleted: 0,
      errors: [] as string[],
    };

    // Delete all accounts for this user
    try {
      const accounts = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.ACCOUNTS,
        [Query.equal('userId', userId), Query.limit(100)]
      );

      for (const account of accounts.documents) {
        try {
          await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.ACCOUNTS,
            account.$id
          );
          results.accountsDeleted++;
        } catch (err: any) {
          results.errors.push(`Failed to delete account ${account.$id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(`Failed to list accounts: ${err.message}`);
    }

    // Delete all Plaid items for this user
    try {
      const plaidItems = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAID_ITEMS,
        [Query.equal('userId', userId), Query.limit(100)]
      );

      for (const item of plaidItems.documents) {
        try {
          await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.PLAID_ITEMS,
            item.$id
          );
          results.plaidItemsDeleted++;
        } catch (err: any) {
          results.errors.push(`Failed to delete Plaid item ${item.$id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(`Failed to list Plaid items: ${err.message}`);
    }

    // Delete all transactions for this user
    try {
      const transactions = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PLAID_TRANSACTIONS,
        [Query.equal('userId', userId), Query.limit(1000)]
      );

      for (const transaction of transactions.documents) {
        try {
          await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.PLAID_TRANSACTIONS,
            transaction.$id
          );
          results.transactionsDeleted++;
        } catch (err: any) {
          results.errors.push(`Failed to delete transaction ${transaction.$id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(`Failed to list transactions: ${err.message}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      results,
    });
  } catch (error: any) {
    console.error('Error in cleanup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup accounts' },
      { status: 500 }
    );
  }
}
