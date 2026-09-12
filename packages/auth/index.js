import { cookies } from 'next/headers';
import { query } from '@ephemeris/db';
import { readSessionValue, SESSION_COOKIE } from './session.js';
import { ApiError } from './errors.js';

export async function currentUser() {
  const cookieStore = await cookies();
  const session = readSessionValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const { rows } = await query(
    `SELECT
      u.id, u.name, u.email, u.role, u.status, u.resort_id, u.access_role_id,
      ar.name AS access_role_name, ar.slug AS access_role_slug, ar.status AS access_role_status,
      ar.access_level AS access_role_level,
      r.name AS resort_name, r.code AS resort_code, r.location AS resort_location,
      r.status AS resort_status
     FROM users u
     LEFT JOIN access_roles ar ON ar.id = u.access_role_id
     LEFT JOIN resorts r ON r.id = u.resort_id
     WHERE u.id = $1
     LIMIT 1`,
    [session.id]
  );
  const user = rows[0];
  if (!user || user.status !== 'active') return null;
  if (user.access_role_status && user.access_role_status !== 'active') return null;
  if (['internal', 'external'].includes(user.role) && user.resort_status !== 'active') return null;
  return user;
}

export async function getUserPermissions(user) {
  if (!user) return [];

  if (user.access_role_level === 'full') {
    const app = user.role === 'admin' ? 'admin' : 'staff';
    const { rows: allPerms } = await query(
      `SELECT permission_key FROM access_permissions WHERE application = $1 ORDER BY permission_key`,
      [app]
    );
    return allPerms.map((row) => row.permission_key);
  }

  const { rows } = await query(
    `SELECT permission.permission_key
     FROM access_role_permissions permission
     JOIN access_roles role ON role.id = permission.access_role_id
     WHERE role.id = COALESCE(
       $1::uuid,
       (SELECT id FROM access_roles
        WHERE is_system AND base_role = $2::user_role AND status = 'active'
        ORDER BY created_at LIMIT 1)
     )
       AND role.status = 'active'
     ORDER BY permission.permission_key`,
    [user.access_role_id || null, user.role]
  );

  return rows.map((row) => row.permission_key);
}

export async function requirePermission(permission, roles = [], { write = false } = {}) {
  const user = await requireUser(roles);
  const permissions = await getUserPermissions(user);
  if (!permissions.includes(permission)) {
    throw new ApiError(403, 'Forbidden');
  }
  if (write && user.access_role_level === 'read_only') {
    throw new ApiError(403, 'This role has read-only access');
  }
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

export { writeAudit } from './audit.js';
export { createLoginHandler, createLogoutHandler } from './handlers.js';
export { ApiError, jsonError, parseJsonBody } from './errors.js';
export { assertSameOrigin } from './origin.js';
export { enforceRegistrationRateLimit } from './registration-rate-limit.js';
