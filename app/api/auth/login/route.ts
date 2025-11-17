import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/appwrite-server';

const SESSION_COOKIE = 'appwrite-session';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    );
  }

  // Use admin client to create session SERVER-SIDE
  const { account } = await createAdminClient();
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

  console.log('[AUTH] Login successful, session cookie set');

  return NextResponse.json({ success: true });
}
