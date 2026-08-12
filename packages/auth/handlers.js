import { cookies } from 'next/headers';
import { query, transaction } from '@ephemeris/db';
import {
  createSessionValue,
  sessionCookieOptions,
  verifyPassword,
  SESSION_COOKIE,
} from './session.js';
import { writeAudit } from './audit.js';

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

/**
 * Membuat handler POST /api/auth/login yang hanya menerima role tertentu.
 * @param {{ allowedRoles?: string[] }} options
 */
export function createLoginHandler({ allowedRoles = [] } = {}) {
  return async function POST(request) {
    try {
      const body = await request.json();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!email || !password || !checkRateLimit(email)) {
        return Response.json({ error: 'Invalid login' }, { status: 401 });
      }

      const { rows } = await query(
        `SELECT
          u.id, u.name, u.email, u.role, u.status, u.password_hash, u.resort_id,
          r.name AS resort_name, r.code AS resort_code, r.location AS resort_location
         FROM users u
         LEFT JOIN resorts r ON r.id = u.resort_id
         WHERE u.email = $1
         LIMIT 1`,
        [email]
      );
      const user = rows[0];

      if (!user || user.status !== 'active' || !verifyPassword(password, user.password_hash)) {
        return Response.json({ error: 'Invalid login' }, { status: 401 });
      }

      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        return Response.json(
          { error: `Akun ${user.role} tidak memiliki akses ke portal ini. Gunakan portal yang sesuai.` },
          { status: 403 }
        );
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
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          resort_id: user.resort_id,
          resort_name: user.resort_name,
          resort_code: user.resort_code,
        },
      });
    } catch (error) {
      console.error(error);
      return Response.json({ error: 'Login failed' }, { status: 500 });
    }
  };
}

/** Handler POST /api/auth/logout untuk membersihkan cookie sesi. */
export function createLogoutHandler() {
  return async function POST() {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    return Response.json({ ok: true });
  };
}
