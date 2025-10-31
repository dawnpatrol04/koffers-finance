import { NextRequest, NextResponse } from 'next/server';
import { storage, databases, ID, DATABASE_ID, COLLECTIONS, STORAGE_BUCKETS } from '@/lib/appwrite-server';
import { InputFile } from 'node-appwrite/file';
import { cookies } from 'next/headers';
import { Client, Account } from 'node-appwrite';

export async function POST(request: NextRequest) {
  try {
    // Get Appwrite session from cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('a_session_' + (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '').toLowerCase());

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
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

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 20MB' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Appwrite Storage
    const uploadedFile = await storage.createFile(
      STORAGE_BUCKETS.FILES,
      ID.unique(),
      InputFile.fromBuffer(buffer, file.name),
      [`read("user:${userId}")`, `delete("user:${userId}")`]
    );

    // Store file metadata in database
    const fileDoc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.FILES,
      ID.unique(),
      {
        userId,
        fileId: uploadedFile.$id,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        ocrStatus: 'pending',
        createdAt: new Date().toISOString(),
      }
    );

    // TODO: Trigger Claude Vision OCR processing (async)
    // This would be done in a separate API endpoint or background job

    return NextResponse.json({
      success: true,
      file: uploadedFile,
      metadata: fileDoc,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
