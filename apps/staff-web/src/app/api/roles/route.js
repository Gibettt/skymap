import {
  ApiError,
  assertSameOrigin,
  jsonError,
  parseJsonBody,
  requirePermission,
  writeAudit,
} from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { createAccessRoleSchema } from "@ephemeris/db/validators/access-role";

import { getAccessRolesData } from "@/lib/access-roles";
import { createAccessRoleRecord } from "@/lib/access-role-write";

export async function GET() {
  try {
    return Response.json(await getAccessRolesData());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const actor = await requirePermission("admin.roles", ["admin"], { write: true });
    const parsed = createAccessRoleSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Invalid role data", details: parsed.error.flatten() }, { status: 400 });
    }

    const role = await transaction(async (client) => {
      const created = await createAccessRoleRecord(client, parsed.data, actor.id);
      await writeAudit(client, {
        actorId: actor.id,
        action: "role.create",
        entityType: "access_role",
        entityId: created.id,
        afterData: { ...created, permissionKeys: parsed.data.permissionKeys },
        request,
      });
      return created;
    });

    return Response.json({ role: { id: role.id, name: role.name } }, { status: 201 });
  } catch (error) {
    if (error?.code === "23505") {
      return Response.json({ error: "A role with this name already exists." }, { status: 409 });
    }
    if (error instanceof ApiError) return jsonError(error);
    return jsonError(error);
  }
}
