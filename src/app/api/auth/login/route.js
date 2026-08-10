import { cookies } from 'next/headers';
import { query, transaction } from '@/lib/db';
import { createSessionValue, sessionCookieOptions, verifyPassword, SESSION_COOKIE } from '@/lib/security';
import { writeAudit } from '@/lib/auth';

const loginAttempts = new Map();

function checkRateLimit(email) {
  const key = email.toLowerCase();
  const now = Date.now();
  const attempts = (loginAttempts.get(key) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (attempts.length >= 10) return false;
  attempts.push(now);
  loginAttempts.set(key, attempts);
  return true;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password || !checkRateLimit(email)) {
      return Response.json({ error: 'Invalid login' }, { status: 401 });
    }

    const { rows } = await query(
      'SELECT id, name, email, role, status, password_hash FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    const user = rows[0];

    if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) {
      return Response.json({ error: 'Invalid login' }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, createSessionValue(user), sessionCookieOptions());

    await transaction((client) => writeAudit(client, {
      actorId: user.id,
      action: 'auth.login',
      entityType: 'user',
      entityId: user.id,
      afterData: { email: user.email, role: user.role },
      request,
    }));

    return Response.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}
