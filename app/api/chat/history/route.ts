import { NextRequest, NextResponse } from 'next/server';
import { DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite-config';
import { createAdminClient, getCurrentUser } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';

// GET /api/chat/history - Load chat history for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();

    // Load last 100 messages
    const history = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CHAT_MESSAGES,
      [
        Query.equal('userId', user.$id),
        Query.orderAsc('$createdAt'),
        Query.limit(100),
      ]
    );

    // Transform to UI format
    const messages = history.documents.map((doc: any) => ({
      id: doc.$id,
      role: doc.role,
      content: doc.content,
      parts: JSON.parse(doc.parts),
      toolInvocations: doc.toolInvocations ? JSON.parse(doc.toolInvocations) : undefined,
      metadata: doc.metadata ? JSON.parse(doc.metadata) : undefined,
      createdAt: new Date(doc.$createdAt),
    }));

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('[Chat History API] Error loading history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/chat/history - Clear all chat history for user
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { databases } = await createAdminClient();

    // Get all messages for this user
    const messages = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CHAT_MESSAGES,
      [
        Query.equal('userId', user.$id),
        Query.limit(1000), // Process up to 1000 messages
      ]
    );

    // Delete each message
    for (const message of messages.documents) {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.CHAT_MESSAGES,
        message.$id
      );
    }

    return NextResponse.json({
      success: true,
      deletedCount: messages.documents.length,
    });
  } catch (error: any) {
    console.error('[Chat History API] Error clearing history:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
