import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';

// Get current user ID from session
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session) {
      return null;
    }

    const sessionData = JSON.parse(session.value);
    return sessionData.userId || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// DELETE /api/keys/[keyId] - Delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await params;

    // Verify the key belongs to the user before deleting
    const key = await databases.getDocument(DATABASE_ID, COLLECTIONS.API_KEYS, keyId);

    if (key.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.API_KEYS, keyId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
