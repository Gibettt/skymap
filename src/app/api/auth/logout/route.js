import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/security';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return Response.json({ ok: true });
}
