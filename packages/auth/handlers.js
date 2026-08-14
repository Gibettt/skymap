import { cookies } from 'next/headers';
import { query, transaction } from '@ephemeris/db';
import { ApiError, parseJsonBody } from './errors.js';
import {
  createSessionValue,
  sessionCookieOptions,
  verifyPassword,
  SESSION_COOKIE,
} from './session.js';
import { writeAudit } from './audit.js';

let rateLimitTableReady = false;

async function ensureRateLimitTable() {
  if (rateLimitTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS rate_limit_login (
      email text NOT NULL,
      attempted_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_rate_limit_login_email_time
    ON rate_limit_login(email, attempted_at)
  `);
  rateLimitTableReady = true;
}

async function checkRateLimit(email) {
  await ensureRateLimitTable();
  const key = email.toLowerCase();
  await query("DELETE FROM rate_limit_login WHERE attempted_at < now() - interval '1 hour'");
  const { rows } = await query(
    `SELECT COUNT(*) AS count
     FROM rate_limit_login
     WHERE email = $1
       AND attempted_at > now() - interval '15 minutes'`,
    [key]
  );
  if (Number(rows[0].count) >= 10) return false;

  await query('INSERT INTO rate_limit_login (email) VALUES ($1)', [key]);
  return true;
}

/**
 * Membuat handler POST /api/auth/login yang hanya menerima role tertentu.
 * @param {{ allowedRoles?: string[] }} options
 */
export function createLoginHandler({ allowedRoles = [] } = {}) {
  return async function POST(request) {
    try {
      const body = await parseJsonBody(request);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!email || !password || !(await checkRateLimit(email))) {
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
      if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
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
