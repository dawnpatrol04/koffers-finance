import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';

// DELETE /api/keys/[keyId] - Delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
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
