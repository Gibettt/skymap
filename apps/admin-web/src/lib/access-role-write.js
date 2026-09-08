import "server-only";

import { ApiError } from "@ephemeris/auth";

import { randomUUID } from "node:crypto";

export function roleApplication(baseRole) {
  return baseRole === "admin" ? "admin" : "staff";
}

export async function requireSystemAccessRole(client, baseRole) {
  const { rows } = await client.query(
    `SELECT * FROM access_roles
     WHERE is_system AND base_role = $1 AND status = 'active'
     ORDER BY created_at
     LIMIT 1
     FOR UPDATE`,
    [baseRole],
  );
  if (!rows[0]) throw new ApiError(409, `The ${baseRole} system fallback role is unavailable`);
  return rows[0];
}

export async function lockRoleAdministration(client) {
  await requireSystemAccessRole(client, "admin");
}

export async function assertWritableRolesAdministratorExists(client) {
  const { rows } = await client.query(`
    SELECT COUNT(DISTINCT user_record.id)::int AS count
    FROM users user_record
    JOIN access_roles role ON role.id = user_record.access_role_id
    JOIN access_role_permissions grant_record
      ON grant_record.access_role_id = role.id
      AND grant_record.permission_key = 'admin.roles'
    WHERE user_record.role = 'admin'
      AND user_record.status = 'active'
      AND role.base_role = 'admin'
      AND role.status = 'active'
      AND role.access_level <> 'read_only'
  `);

  if (Number(rows[0]?.count ?? 0) < 1) {
    throw new ApiError(409, "At least one active Admin must retain writable Roles access");
  }
}

export async function markAccessRolesChanged(client, roleIds, actorId) {
  const uniqueRoleIds = [...new Set(roleIds.filter(Boolean).map(String))].sort();
  if (!uniqueRoleIds.length) return;

  await client.query(
    `UPDATE access_roles
     SET permissions_updated_at = now(), updated_by = $2
     WHERE id = ANY($1::uuid[]) AND status = 'active'`,
    [uniqueRoleIds, actorId],
  );
}

export async function validatePermissionKeys(client, permissionKeys, baseRole) {
  if (!permissionKeys.length) return;

  const { rows } = await client.query(
    `SELECT permission_key, application
     FROM access_permissions
     WHERE permission_key = ANY($1::text[])`,
    [permissionKeys],
  );
  if (rows.length !== permissionKeys.length) {
    throw new ApiError(400, "One or more permissions are invalid");
  }

  const expectedApplication = roleApplication(baseRole);
  if (rows.some((permission) => permission.application !== expectedApplication)) {
    throw new ApiError(400, `Permissions must belong to the ${expectedApplication} application`);
  }
}

export async function replaceRolePermissions(client, roleId, permissionKeys, actorId) {
  await client.query("DELETE FROM access_role_permissions WHERE access_role_id = $1", [roleId]);
  for (const permissionKey of permissionKeys) {
    await client.query(
      `INSERT INTO access_role_permissions (access_role_id, permission_key, granted_by)
       VALUES ($1, $2, $3)`,
      [roleId, permissionKey, actorId],
    );
  }
}

export async function createAccessRoleRecord(client, data, actorId) {
  await validatePermissionKeys(client, data.permissionKeys, data.baseRole);
  const slugBase = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 55);
  const slug = `${slugBase || "role"}-${randomUUID().slice(0, 8)}`;
  const { rows } = await client.query(
    `INSERT INTO access_roles
      (slug, name, description, base_role, access_level, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     RETURNING *`,
    [slug, data.name, data.description, data.baseRole, data.accessLevel, actorId],
  );
  await replaceRolePermissions(client, rows[0].id, data.permissionKeys, actorId);
  return rows[0];
}
