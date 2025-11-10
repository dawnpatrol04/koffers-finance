import { NextRequest, NextResponse } from 'next/server';
import { storage, databases, DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
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

    // Get update data from request body
    const updateData = await request.json();

    // Update file metadata
    const updated = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.FILES,
      fileDoc.$id,
      updateData
    );

    return NextResponse.json({ success: true, file: updated });
  } catch (error: any) {
    console.error('File update error:', error);
    return NextResponse.json(
      { error: error.message || 'Update failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
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
