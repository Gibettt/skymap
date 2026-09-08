import "server-only";

import { requirePermission } from "@ephemeris/auth";
import { query } from "@ephemeris/db";

function toIso(value) {
  return value ? new Date(value).toISOString() : null;
}

export async function getAccessRolesData() {
  await requirePermission("admin.roles", ["admin"]);

  const [rolesResult, permissionsResult, membersResult, grantsResult] = await Promise.all([
    query(`
      SELECT
        role.id,
        role.slug,
        role.name,
        role.description,
        role.base_role,
        role.access_level,
        role.is_system,
        role.status,
        role.permissions_updated_at,
        role.last_reviewed_at,
        role.created_at,
        role.updated_at,
        CASE WHEN role.is_system THEN 'System' ELSE COALESCE(owner.name, 'Unknown') END AS owner,
        COUNT(DISTINCT member.id)::int AS member_count
      FROM access_roles role
      LEFT JOIN users owner ON owner.id = role.created_by
      LEFT JOIN users member ON member.access_role_id = role.id
      WHERE role.status = 'active'
      GROUP BY role.id, owner.name
      ORDER BY role.is_system DESC, role.created_at, role.name
    `),
    query(`
      SELECT
        permission.permission_key,
        permission.name,
        permission.description,
        permission.application,
        permission.sort_order,
        COUNT(grant_record.access_role_id) FILTER (WHERE role.status = 'active')::int AS role_count
      FROM access_permissions permission
      LEFT JOIN access_role_permissions grant_record
        ON grant_record.permission_key = permission.permission_key
      LEFT JOIN access_roles role ON role.id = grant_record.access_role_id
      GROUP BY permission.permission_key
      ORDER BY permission.sort_order, permission.name
    `),
    query(`
      SELECT
        user_record.id,
        user_record.name,
        user_record.email,
        user_record.role AS base_role,
        user_record.status,
        user_record.access_role_id,
        resort.name AS resort_name
      FROM users user_record
      LEFT JOIN resorts resort ON resort.id = user_record.resort_id
      ORDER BY user_record.status = 'active' DESC, user_record.name
    `),
    query(`
      SELECT grant_record.access_role_id, permission.permission_key, permission.name
      FROM access_role_permissions grant_record
      JOIN access_permissions permission ON permission.permission_key = grant_record.permission_key
      ORDER BY grant_record.access_role_id, permission.sort_order, permission.name
    `),
  ]);

  const grantsByRole = new Map();
  for (const grant of grantsResult.rows) {
    const grants = grantsByRole.get(grant.access_role_id) || [];
    grants.push(grant);
    grantsByRole.set(grant.access_role_id, grants);
  }

  return {
    roles: rolesResult.rows.map((role) => ({
      id: String(role.id),
      slug: String(role.slug),
      role: String(role.name),
      description: String(role.description ?? ""),
      baseRole: String(role.base_role),
      group: role.is_system ? "System roles" : "Custom roles",
      accessLevel:
        role.access_level === "read_only" ? "Read only" : role.access_level === "full" ? "Full" : "Scoped",
      users: Number(role.member_count),
      permissionSets: (grantsByRole.get(role.id) || []).map((grant) => String(grant.name)),
      permissionKeys: (grantsByRole.get(role.id) || []).map((grant) => String(grant.permission_key)),
      lastReview: toIso(role.last_reviewed_at),
      permissionsUpdatedAt: toIso(role.permissions_updated_at),
      owner: String(role.owner),
      status:
        !role.last_reviewed_at || new Date(role.permissions_updated_at) > new Date(role.last_reviewed_at)
          ? "Needs review"
          : "Active",
      isSystem: Boolean(role.is_system),
      createdAt: toIso(role.created_at),
      updatedAt: toIso(role.updated_at),
    })),
    permissions: permissionsResult.rows.map((permission) => ({
      key: String(permission.permission_key),
      name: String(permission.name),
      description: String(permission.description ?? ""),
      application: String(permission.application),
      roleCount: Number(permission.role_count),
    })),
    members: membersResult.rows.map((member) => ({
      id: String(member.id),
      name: String(member.name),
      email: String(member.email),
      baseRole: String(member.base_role),
      status: String(member.status),
      accessRoleId: String(member.access_role_id),
      resortName: member.resort_name ? String(member.resort_name) : null,
    })),
  };
}
