import { NextRequest, NextResponse } from 'next/server';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { createAdminClient, getCurrentUser } from '@/lib/appwrite-server';

// DELETE /api/keys/[keyId] - Delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    // Get authenticated user
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { keyId } = await params;

    const { databases } = await createAdminClient();

    // Verify the key belongs to the user before deleting
    const key = await databases.getDocument(DATABASE_ID, COLLECTIONS.API_KEYS, keyId);

    if (key.userId !== user.$id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.API_KEYS, keyId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting API key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
