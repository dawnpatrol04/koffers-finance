import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { createSessionClient } from '@/lib/appwrite-server';
import { DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-config';

// DELETE /api/conversations/[id] - Delete a conversation and its messages
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { databases, account } = await createSessionClient(request);
    const user = await account.get();
    const conversationId = params.id;

    // Verify the conversation belongs to the current user
    const conversation = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      conversationId
    );

    if (conversation.userId !== user.$id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete all messages in this conversation
    const messages = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CHAT_MESSAGES,
      [
        Query.equal('conversationId', conversationId),
        Query.limit(1000) // Adjust limit as needed
      ]
    );

    // Delete messages in batches
    for (const message of messages.documents) {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.CHAT_MESSAGES,
        message.$id
      );
    }

    // Delete the conversation
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      conversationId
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Conversations API] Error deleting conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete conversation' },
      { status: error.code || 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update a conversation (title, isPinned, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { databases, account } = await createSessionClient(request);
    const user = await account.get();
    const conversationId = params.id;
    const body = await request.json();

    // Verify the conversation belongs to the current user
    const conversation = await databases.getDocument(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      conversationId
    );

    if (conversation.userId !== user.$id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update the conversation
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.isPinned !== undefined) updates.isPinned = body.isPinned;

    const updated = await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.CONVERSATIONS,
      conversationId,
      updates
    );

    return NextResponse.json({ conversation: updated });
  } catch (error: any) {
    console.error('[Conversations API] Error updating conversation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update conversation' },
      { status: error.code || 500 }
    );
  }
}
