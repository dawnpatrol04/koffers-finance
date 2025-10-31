import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';
import { Query } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
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
