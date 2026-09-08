import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { updateAccessRoleSchema } from "@ephemeris/db/validators/access-role";
import { uuidSchema } from "@ephemeris/db/validators/common";

import {
  assertWritableRolesAdministratorExists,
  lockRoleAdministration,
  markAccessRolesChanged,
  replaceRolePermissions,
  requireSystemAccessRole,
  validatePermissionKeys,
} from "@/lib/access-role-write";

async function loadRoleForUpdate(client, id) {
  const { rows } = await client.query("SELECT * FROM access_roles WHERE id = $1 FOR UPDATE", [id]);
  if (!rows[0]) return null;
  const { rows: permissions } = await client.query(
    "SELECT permission_key FROM access_role_permissions WHERE access_role_id = $1 ORDER BY permission_key",
    [id],
  );
  return { ...rows[0], permission_keys: permissions.map((permission) => permission.permission_key) };
}

async function updateRoleDetails(client, role, data, actor) {
  if (role.name === data.name && role.description === data.description && role.access_level === data.accessLevel) {
    return role;
  }
  const { rows } = await client.query(
    `UPDATE access_roles
     SET name = $2,
       description = $3,
       access_level = $4,
       permissions_updated_at = CASE
         WHEN access_level <> $4 THEN now()
         ELSE permissions_updated_at
       END,
       updated_by = $5
     WHERE id = $1
     RETURNING *`,
    [role.id, data.name, data.description, data.accessLevel, actor.id],
  );
  return rows[0];
}

async function updateRolePermissions(client, role, data, actor) {
  await validatePermissionKeys(client, data.permissionKeys, role.base_role);
  const permissionsChanged =
    role.permission_keys.length !== data.permissionKeys.length ||
    role.permission_keys.some((permission) => !data.permissionKeys.includes(permission));
  if (!permissionsChanged) return role;

  await replaceRolePermissions(client, role.id, data.permissionKeys, actor.id);
  const { rows } = await client.query(
    `UPDATE access_roles
     SET permissions_updated_at = now(), updated_by = $2
     WHERE id = $1
     RETURNING *`,
    [role.id, actor.id],
  );
  return { ...rows[0], permission_keys: data.permissionKeys };
}

async function updateRoleMembers(client, role, data, actor) {
  const requestedIds = data.memberIds;
  const { rows: currentMemberRows } = await client.query(
    `SELECT id FROM users
     WHERE access_role_id = $1
     ORDER BY id
     FOR UPDATE`,
    [role.id],
  );
  const currentIds = currentMemberRows.map((member) => String(member.id));
  let requestedMembers = [];

  if (requestedIds.length) {
    const { rows } = await client.query(
      `SELECT id, role, access_role_id
       FROM users
       WHERE id = ANY($1::uuid[])
       ORDER BY id
       FOR UPDATE`,
      [requestedIds],
    );
    requestedMembers = rows;
    if (requestedMembers.length !== requestedIds.length) throw new ApiError(400, "One or more users do not exist");
    if (requestedMembers.some((member) => member.role !== role.base_role)) {
      throw new ApiError(400, "Members must use the same base portal role");
    }
  }

  if (role.is_system) {
    const requestedIdSet = new Set(requestedIds);
    if (currentIds.some((id) => !requestedIdSet.has(id))) {
      throw new ApiError(409, "System role members must be moved to another role instead of removed");
    }
  }

  const membershipChanged =
    currentIds.length !== requestedIds.length || currentIds.some((id) => !requestedIds.includes(id));
  if (!membershipChanged) return { after: role, before: role };

  const affectedRoleIds = new Set([String(role.id)]);
  for (const member of requestedMembers) {
    if (member.access_role_id) affectedRoleIds.add(String(member.access_role_id));
  }

  if (!role.is_system) {
    const systemRole = await requireSystemAccessRole(client, role.base_role);
    if (currentIds.some((id) => !requestedIds.includes(id))) {
      affectedRoleIds.add(String(systemRole.id));
    }
    await client.query(
      `UPDATE users
       SET access_role_id = $2
       WHERE access_role_id = $1
         AND NOT (id = ANY($3::uuid[]))`,
      [role.id, systemRole.id, requestedIds],
    );
  }

  if (requestedIds.length) {
    await client.query(`UPDATE users SET access_role_id = $1 WHERE id = ANY($2::uuid[])`, [role.id, requestedIds]);
  }
  await markAccessRolesChanged(client, [...affectedRoleIds], actor.id);
  const { rows } = await client.query("SELECT * FROM access_roles WHERE id = $1", [role.id]);
  return {
    before: { ...role, member_ids: currentIds },
    after: { ...rows[0], permission_keys: role.permission_keys, member_ids: requestedIds },
  };
}

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const actor = await requirePermission("admin.roles", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) return Response.json({ error: "Invalid role ID" }, { status: 400 });
    const parsed = updateAccessRoleSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Invalid role update", details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await transaction(async (client) => {
      await lockRoleAdministration(client);
      const role = await loadRoleForUpdate(client, parsedId.data);
      if (role?.status !== "active") return null;

      let after;
      let beforeForAudit = role;
      if (parsed.data.action === "details") after = await updateRoleDetails(client, role, parsed.data, actor);
      if (parsed.data.action === "permissions") after = await updateRolePermissions(client, role, parsed.data, actor);
      if (parsed.data.action === "members") {
        const membershipUpdate = await updateRoleMembers(client, role, parsed.data, actor);
        beforeForAudit = membershipUpdate.before;
        after = membershipUpdate.after;
      }
      if (parsed.data.action === "review") {
        const { rows } = await client.query(
          `UPDATE access_roles SET last_reviewed_at = now(), updated_by = $2 WHERE id = $1 RETURNING *`,
          [role.id, actor.id],
        );
        after = rows[0];
      }

      if (after !== role && parsed.data.action !== "review") {
        await assertWritableRolesAdministratorExists(client);
      }

      if (after !== role) {
        await writeAudit(client, {
          actorId: actor.id,
          action: `role.${parsed.data.action}`,
          entityType: "access_role",
          entityId: role.id,
          beforeData: beforeForAudit,
          afterData: after,
          request,
        });
      }
      return after;
    });

    if (!updated) return Response.json({ error: "Role not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    if (error.code === "23505") {
      return Response.json({ error: "A role with this name already exists." }, { status: 409 });
    }
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const actor = await requirePermission("admin.roles", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) return Response.json({ error: "Invalid role ID" }, { status: 400 });

    const archived = await transaction(async (client) => {
      const role = await loadRoleForUpdate(client, parsedId.data);
      if (role?.status !== "active") return null;
      if (role.is_system) throw new ApiError(400, "System roles cannot be archived");
      const { rows: members } = await client.query(
        "SELECT COUNT(*)::int AS count FROM users WHERE access_role_id = $1",
        [role.id],
      );
      if (members[0].count > 0) throw new ApiError(409, "Move all members before archiving this role");

      const { rows } = await client.query(
        `UPDATE access_roles SET status = 'archived', updated_by = $2 WHERE id = $1 RETURNING *`,
        [role.id, actor.id],
      );
      await writeAudit(client, {
        actorId: actor.id,
        action: "role.archive",
        entityType: "access_role",
        entityId: role.id,
        beforeData: role,
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    if (!archived) return Response.json({ error: "Role not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
