import { NextResponse } from 'next/server';
import { readSessionValue, SESSION_COOKIE } from '@ephemeris/auth/session';

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const session = readSessionValue(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const routeRole = pathname.split('/')[2];
  if (['internal', 'external'].includes(routeRole) && session.role !== routeRole) {
    return NextResponse.redirect(new URL(`/dashboard/${session.role}`, request.url));
  }

  if (session.role === 'external') {
    const allowed = [
      '/dashboard/external',
      '/dashboard/external/bookings',
      '/dashboard/external/instruments',
      '/dashboard/external/jadwal',
      '/dashboard/external/observations',
      '/dashboard/external/payout',
      '/dashboard/external/reports',
      '/dashboard/external/settings',
      '/dashboard/external/users',
    ];
    if (!allowed.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.redirect(new URL('/dashboard/external', request.url));
    }
  }

  if (session.role === 'internal') {
    const allowed = [
      '/dashboard/internal',
      '/dashboard/internal/bookings',
      '/dashboard/internal/form-booking',
      '/dashboard/internal/jadwal',
      '/dashboard/internal/observations',
      '/dashboard/internal/package',
      '/dashboard/internal/payout',
      '/dashboard/internal/settings',
    ];
    if (!allowed.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.redirect(new URL('/dashboard/internal', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/dashboard/:path*',
};
