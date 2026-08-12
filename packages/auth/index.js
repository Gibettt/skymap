import { cookies, headers } from 'next/headers';
import { query } from '@ephemeris/db';
import { readSessionValue, SESSION_COOKIE } from './session.js';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function jsonError(error) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}

export async function currentUser() {
  const cookieStore = await cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const { rows } = await query(
    `SELECT
      u.id, u.name, u.email, u.role, u.status, u.resort_id,
      r.name AS resort_name, r.code AS resort_code, r.location AS resort_location
     FROM users u
     LEFT JOIN resorts r ON r.id = u.resort_id
     WHERE u.id = $1
     LIMIT 1`,
    [session.id]
  );
  const user = rows[0];
  if (!user || user.status !== 'active') return null;
  return user;
}

export async function requireUser(roles = []) {
  const user = await currentUser();
  if (!user) throw new ApiError(401, 'Unauthorized');
  if (roles.length && !roles.includes(user.role)) {
    throw new ApiError(403, 'Forbidden');
  }
  return user;
}

export async function assertSameOrigin(request) {
  const method = request.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return;

  const headerStore = await headers();
  const origin = headerStore.get('origin');
  const host = headerStore.get('host');
  if (origin && host && new URL(origin).host !== host) {
    throw new ApiError(403, 'Invalid request origin');
  }
}

export { writeAudit } from './audit.js';
export { createLoginHandler, createLogoutHandler } from './handlers.js';
