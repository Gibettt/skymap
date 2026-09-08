import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { importAccessRolesSchema } from "@ephemeris/db/validators/access-role";

import {
  createAccessRoleRecord,
  replaceRolePermissions,
  validatePermissionKeys,
} from "@/lib/access-role-write";

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const actor = await requirePermission("admin.roles", ["admin"], { write: true });
    const parsed = importAccessRolesSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Invalid roles JSON", details: parsed.error.flatten() }, { status: 400 });
    }

    const imported = await transaction(async (client) => {
      const results = [];
      for (const data of parsed.data.roles) {
        const { rows: existingRows } = await client.query(
          "SELECT * FROM access_roles WHERE lower(name) = lower($1) FOR UPDATE",
          [data.name],
        );
        const existing = existingRows[0];
        if (existing?.is_system) throw new ApiError(400, `System role ${existing.name} cannot be imported`);

        let role;
        if (existing) {
          if (existing.base_role !== data.baseRole) {
            const { rows: memberRows } = await client.query(
              "SELECT COUNT(*)::int AS count FROM users WHERE access_role_id = $1",
              [existing.id],
            );
            if (memberRows[0].count > 0) {
              throw new ApiError(409, `Move members out of ${existing.name} before changing its base role`);
            }
          }
          await validatePermissionKeys(client, data.permissionKeys, data.baseRole);
          const { rows } = await client.query(
            `UPDATE access_roles
             SET description = $2, base_role = $3, access_level = $4, status = 'active',
               permissions_updated_at = now(), updated_by = $5
             WHERE id = $1
             RETURNING *`,
            [existing.id, data.description, data.baseRole, data.accessLevel, actor.id],
          );
          role = rows[0];
          await replaceRolePermissions(client, role.id, data.permissionKeys, actor.id);
        } else {
          role = await createAccessRoleRecord(client, data, actor.id);
        }
        results.push({ id: role.id, name: role.name });
      }

      await writeAudit(client, {
        actorId: actor.id,
        action: "role.import",
        entityType: "access_role",
        afterData: { roles: results },
        request,
      });
      return results;
    });

    return Response.json({ roles: imported });
  } catch (error) {
    if (error?.code === "23505") {
      return Response.json({ error: "The import contains a duplicate role name." }, { status: 409 });
    }
    return jsonError(error);
  }
}
