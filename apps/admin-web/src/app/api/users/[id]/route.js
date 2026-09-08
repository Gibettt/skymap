import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { coverageRoleRemoved } from "@ephemeris/db/resort-coverage";
import { uuidSchema } from "@ephemeris/db/validators/common";
import { updateUserAssignmentSchema } from "@ephemeris/db/validators/user";

import {
  assertWritableRolesAdministratorExists,
  lockRoleAdministration,
  markAccessRolesChanged,
  requireSystemAccessRole,
} from "@/lib/access-role-write";

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const actor = await requirePermission("admin.users", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) return Response.json({ error: "Invalid user ID" }, { status: 400 });
    const id = parsedId.data;
    const parsed = updateUserAssignmentSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Invalid user data", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    if (data.role !== "admin" && !data.resortId) throw new ApiError(400, "Staff must be assigned to a resort");
    if (id === actor.id && (data.role !== "admin" || data.status !== "active")) {
      throw new ApiError(400, "You cannot remove your own active Admin access");
    }

    const updated = await transaction(async (client) => {
      await lockRoleAdministration(client);
      const before = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [id]);
      if (!before.rows[0]) return null;

      const resortIds = [...new Set([before.rows[0].resort_id, data.resortId].filter(Boolean))].sort();
      if (resortIds.length) {
        const resorts = await client.query("SELECT id FROM resorts WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE", [
          resortIds,
        ]);
        if (data.resortId && !resorts.rows.some((resort) => resort.id === data.resortId)) {
          throw new ApiError(400, "Resort not found");
        }
      }

      const removedRole = coverageRoleRemoved(before.rows[0], data);
      if (removedRole) {
        const { rows: coverageRows } = await client.query(
          `
          SELECT
            (SELECT COUNT(*)::int FROM users
              WHERE resort_id = $1 AND role = $2 AND status = 'active' AND id <> $3) AS replacement_count,
            (SELECT COUNT(*)::int FROM bookings
              WHERE resort_id = $1 AND status IN ('pending', 'active', 'rescheduled')) AS open_bookings_count
        `,
          [before.rows[0].resort_id, removedRole, id],
        );
        const coverage = coverageRows[0];
        if (coverage.replacement_count === 0 && coverage.open_bookings_count > 0) {
          throw new ApiError(
            409,
            "The last covered staff member cannot be moved or deactivated while the resort has open bookings.",
          );
        }
      }

      const currentAccessRole = await client.query(
        `SELECT id FROM access_roles
         WHERE id = $1 AND base_role = $2 AND status = 'active'
         FOR UPDATE`,
        [before.rows[0].access_role_id, data.role],
      );
      const accessRoleId = currentAccessRole.rows[0]
        ? currentAccessRole.rows[0].id
        : (await requireSystemAccessRole(client, data.role)).id;

      const { rows } = await client.query(
        `UPDATE users SET name = $2, email = $3, phone = $4, role = $5,
          status = $6, resort_id = $7, access_role_id = $8 WHERE id = $1 RETURNING *`,
        [
          id,
          data.name,
          data.email.toLowerCase(),
          data.phone || null,
          data.role,
          data.status,
          data.role === "admin" ? null : data.resortId,
          accessRoleId,
        ],
      );
      if (String(before.rows[0].access_role_id) !== String(accessRoleId) || before.rows[0].status !== data.status) {
        await markAccessRolesChanged(client, [before.rows[0].access_role_id, accessRoleId], actor.id);
      }
      await assertWritableRolesAdministratorExists(client);
      await writeAudit(client, {
        actorId: actor.id,
        action: "user.update",
        entityType: "user",
        entityId: id,
        beforeData: before.rows[0],
        afterData: rows[0],
        request,
      });
      return rows[0];
    });
    if (!updated) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json({ user: updated });
  } catch (error) {
    if (error.code === "23505") {
      return Response.json({ error: "This email is already used by another account." }, { status: 409 });
    }
    if (error.code === "23514") {
      return Response.json(
        { error: "This change was rejected because the staff member is still required for open resort bookings." },
        { status: 409 },
      );
    }
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const actor = await requirePermission("admin.users", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) return Response.json({ error: "Invalid user ID" }, { status: 400 });
    const id = parsedId.data;

    if (id === actor.id) throw new ApiError(400, "You cannot delete your own account");

    const deleted = await transaction(async (client) => {
      await lockRoleAdministration(client);
      const before = await client.query("SELECT * FROM users WHERE id = $1 FOR UPDATE", [id]);
      if (!before.rows[0]) return null;

      await client.query("DELETE FROM users WHERE id = $1", [id]);
      await markAccessRolesChanged(client, [before.rows[0].access_role_id], actor.id);
      await assertWritableRolesAdministratorExists(client);
      await writeAudit(client, {
        actorId: actor.id,
        action: "user.delete",
        entityType: "user",
        entityId: id,
        beforeData: before.rows[0],
        request,
      });
      return before.rows[0];
    });

    if (!deleted) return Response.json({ error: "User not found" }, { status: 404 });
    return Response.json({ success: true, user: deleted });
  } catch (error) {
    if (error.code === "23503") {
      return Response.json(
        {
          error:
            "This user is linked to operational history and cannot be deleted. Set the account to inactive instead.",
        },
        { status: 409 },
      );
    }
    if (error.code === "23514") {
      return Response.json(
        { error: "This user is still required for open resort bookings and cannot be deleted." },
        { status: 409 },
      );
    }
    return jsonError(error);
  }
}
