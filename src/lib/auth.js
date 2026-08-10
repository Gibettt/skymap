import { cookies, headers } from 'next/headers';
import { query } from './db';
import { readSessionValue, SESSION_COOKIE } from './security';

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
    'SELECT id, name, email, role, status FROM users WHERE id = $1 LIMIT 1',
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

export async function writeAudit(client, { actorId, action, entityType, entityId, beforeData, afterData, request }) {
  const ip = request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = request?.headers.get('user-agent') || null;
  await client.query(
    `INSERT INTO audit_logs
      (actor_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
    [
      actorId || null,
      action,
      entityType,
      entityId || null,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      ip,
      userAgent,
    ]
  );
}
