import { NextRequest, NextResponse } from 'next/server';
import { databases, DATABASE_ID, COLLECTIONS } from '@/lib/appwrite-server';
import { cookies } from 'next/headers';
import { Query, Client, Account } from 'node-appwrite';

export async function GET(request: NextRequest) {
  try {
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
