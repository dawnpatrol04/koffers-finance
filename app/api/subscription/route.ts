import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAdminClient } from '@/lib/appwrite-server';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to query subscriptions collection
    const { databases } = await createAdminClient();

    const subscriptions = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SUBSCRIPTIONS,
      [Query.equal('userId', user.$id)]
    );

    if (subscriptions.documents.length > 0) {
      return NextResponse.json({
        subscription: subscriptions.documents[0],
      });
    }

    return NextResponse.json({ subscription: null });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch subscription', details: errorMessage },
      { status: 500 }
    );
  }
}
