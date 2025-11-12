import { NextRequest, NextResponse } from 'next/server';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';
import { databases, createSessionClient } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    // Validate session and get userId securely
    const { account } = await createSessionClient();
    const user = await account.get();
    const userId = user.$id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, completed, failed
    const limit = Number(searchParams.get('limit')) || 50;
    const offset = Number(searchParams.get('offset')) || 0;

    // Build query
    const queries = [
      Query.equal('userId', userId),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc('createdAt'),
    ];

    if (status) {
      queries.push(Query.equal('ocrStatus', status));
    }

    // Fetch files from database
    const filesResponse = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.FILES,
      queries
    );

    return NextResponse.json({
      files: filesResponse.documents.map((doc: any) => ({
        id: doc.$id,
        fileId: doc.fileId,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        ocrStatus: doc.ocrStatus,
        createdAt: doc.createdAt,
        transactionId: doc.transactionId || null,
        fileType: doc.fileType || null,
      })),
      total: filesResponse.total,
    });
  } catch (error: any) {
    // Handle authentication errors
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('List files error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list files' },
      { status: 500 }
    );
  }
}
