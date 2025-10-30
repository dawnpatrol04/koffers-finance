import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite-server';
import { Query } from 'node-appwrite';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';

// Get current user ID from session
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (!session) {
      return null;
    }

    const sessionData = JSON.parse(session.value);
    return sessionData.userId || null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// GET /api/keys - List all API keys for the current user
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keys = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.API_KEYS,
      [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
    );

    // Don't send the actual key value to the client, only show prefix
    const safeKeys = keys.documents.map((key: any) => ({
      $id: key.$id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      createdAt: key.$createdAt,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
    }));

    return NextResponse.json({ keys: safeKeys });
  } catch (error: any) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, expiresInDays } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate a secure API key: kf_live_[32 random characters]
    const keyValue = `kf_live_${nanoid(32)}`;
    const keyPrefix = `${keyValue.substring(0, 11)}...`; // Show kf_live_xxx...

    // Calculate expiration date if provided
    let expiresAt = null;
    if (expiresInDays && typeof expiresInDays === 'number' && expiresInDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + expiresInDays);
      expiresAt = expDate.toISOString();
    }

    const keyDoc = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.API_KEYS,
      ID.unique(),
      {
        userId,
        name,
        keyValue, // Store the full key (hashed in production!)
        keyPrefix,
        lastUsedAt: null,
        expiresAt,
      }
    );

    // Return the full key ONLY on creation (user won't see it again)
    return NextResponse.json({
      key: {
        $id: keyDoc.$id,
        name: keyDoc.name,
        keyValue, // Full key shown only once
        keyPrefix: keyDoc.keyPrefix,
        createdAt: keyDoc.$createdAt,
        expiresAt: keyDoc.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating API key:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/keys/[keyId] is handled in a separate route
