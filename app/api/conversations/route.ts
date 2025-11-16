import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { createSessionClient } from '@/lib/appwrite-server';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';

// GET /api/conversations - List all conversations for current user
export async function GET(request: NextRequest) {
  try {
    const { databases, account } = await createSessionClient(request);
    const user = await account.get();

    // Fetch conversations for current user
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      [
        Query.equal('userId', user.$id),
        Query.orderDesc('$updatedAt'),
        Query.limit(100)
      ]
    );

    return NextResponse.json({
      conversations: response.documents,
      total: response.total
    });
  } catch (error: any) {
    console.error('[Conversations API] Error fetching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: error.code || 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(request: NextRequest) {
  try {
    const { databases, account } = await createSessionClient(request);
    const user = await account.get();
    const body = await request.json();

    const { title, isPinned = false } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create new conversation
    const conversation = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      'unique()',
      {
        userId: user.$id,
        title,
        isPinned,
        messageCount: 0
      }
    );

    return NextResponse.json({ conversation });
  } catch (error: any) {
    console.error('[Conversations API] Error creating conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: error.code || 500 }
    );
  }
}
