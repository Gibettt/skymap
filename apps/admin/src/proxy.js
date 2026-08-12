import { NextResponse } from 'next/server';
import { readSessionValue, SESSION_COOKIE } from '@ephemeris/auth/session';

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const session = readSessionValue(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Portal admin hanya menerima role admin.
  if (session.role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};
