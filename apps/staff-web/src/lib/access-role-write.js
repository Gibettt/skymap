import "server-only";

import { randomUUID } from "node:crypto";

import { ApiError } from "@ephemeris/auth";

export function roleApplication(baseRole) {
  return baseRole === "admin" ? "admin" : "staff";
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
