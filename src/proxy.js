import crypto from 'crypto';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'ephemeris_session';

function sign(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

function readSession(value) {
  if (!value || !value.includes('.')) return null;
  const [payload, signature] = value.split('.');
  if (signature !== sign(payload)) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const session = readSession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const routeRole = pathname.split('/')[2];
  if (['admin', 'internal', 'external'].includes(routeRole) && session.role !== routeRole) {
    return NextResponse.redirect(new URL(`/dashboard/${session.role}`, request.url));
  }

  if (session.role === 'external') {
    const allowed = [
      '/dashboard/external',
      '/dashboard/external/bookings',
      '/dashboard/external/jadwal',
      '/dashboard/external/settings',
      '/dashboard/external/observations',
    ];
    if (!allowed.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
      return NextResponse.redirect(new URL('/dashboard/external', request.url));
    }
  }

  if (session.role === 'internal') {
    const allowed = [
      '/dashboard/internal',
      '/dashboard/internal/bookings',
      '/dashboard/internal/jadwal',
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
