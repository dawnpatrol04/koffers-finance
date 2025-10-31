import { NextRequest, NextResponse } from 'next/server';
import { storage, databases, DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';
import { Query } from 'node-appwrite';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Get session from cookies
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse session to get userId
    let userId: string;
    try {
      const sessionData = JSON.parse(session.value);
      userId = sessionData.userId;
    } catch {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get file metadata from database
    const fileDocs = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.FILES,
      [
        Query.equal('fileId', fileId),
        Query.equal('userId', userId),
        Query.limit(1)
      ]
    );

    if (fileDocs.documents.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileDoc = fileDocs.documents[0];

    // Delete from storage
    await storage.deleteFile(STORAGE_BUCKETS.FILES, fileId);

    // Delete metadata from database
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.FILES,
      fileDoc.$id
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 }
    );
  }
}
