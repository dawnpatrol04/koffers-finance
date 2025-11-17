import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE = "appwrite-session";

export async function POST(request: NextRequest) {
  try {
    const { sessionSecret } = await request.json();

    if (!sessionSecret) {
      return NextResponse.json(
        { error: 'Session secret is required' },
        { status: 400 }
      );
    }

    // Set the cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionSecret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    console.log('[AUTH] Session cookie set successfully');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[AUTH] Failed to set session cookie:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set session' },
      { status: 500 }
    );
  }
}
