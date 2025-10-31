import { NextRequest, NextResponse } from 'next/server';
import { storage, databases, DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';
import { Query, Client, Account } from 'node-appwrite';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Get Appwrite session from cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('a_session_' + (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '').toLowerCase());

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create a new client with the session
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || '')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '');

    // Set the session from cookie
    client.setSession(sessionCookie.value);

    // Get current user using the session
    const accountService = new Account(client);
    const user = await accountService.get();
    const userId = user.$id;

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
