import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/appwrite-server';
import { ID } from 'node-appwrite';

const SESSION_COOKIE = 'appwrite-session';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const { account } = await createAdminClient();

    // Create the user
    await account.create(ID.unique(), email, password, name);

    // Immediately create session for the new user
    const session = await account.createEmailPasswordSession(email, password);

    // Set OUR cookie with the session secret
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    console.log('[AUTH] Signup successful, user created and logged in');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[AUTH] Signup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 400 }
    );
  }
}
