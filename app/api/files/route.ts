import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get files from database
    const files = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.FILES,
      [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt'),
        Query.limit(100)
      ]
    );

    return NextResponse.json({
      files: files.documents,
      total: files.total
    });
  } catch (error: any) {
    console.error('Files list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
