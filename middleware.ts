import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkSubscriptionAccess, getAccessDeniedMessage } from './lib/subscription-check';

const SESSION_COOKIE = "appwrite-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user has session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  const hasSession = !!sessionCookie;

  // Public routes that don't require auth
  const isPublicRoute = pathname === '/' || pathname === '/login';

  // Protected routes that require auth
  const isProtectedRoute = pathname.startsWith('/dashboard');

  // Routes that require paid subscription
  // Allow billing page so users can subscribe, but protect everything else
  const requiresSubscription = isProtectedRoute && !pathname.startsWith('/dashboard/settings/billing');

  // API routes (most need auth, except webhooks)
  const isAPIRoute = pathname.startsWith('/api/');
  const isPublicAPI = pathname.startsWith('/api/webhook') ||
                      pathname.startsWith('/api/plaid/webhook');

  // If accessing protected route without session, redirect to login
  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing API route without session (except public APIs), return 401
  if (isAPIRoute && !hasSession && !isPublicAPI) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check subscription for routes that require it
  if (requiresSubscription && hasSession) {
    const subscriptionCheck = await checkSubscriptionAccess();

    if (!subscriptionCheck.hasAccess) {
      // Redirect to billing page with message
      const billingUrl = new URL('/dashboard/settings/billing', request.url);
      billingUrl.searchParams.set('reason', subscriptionCheck.reason || 'no_subscription');
      billingUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(billingUrl);
    }
  }

  // If accessing login page with session, redirect to dashboard
  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
