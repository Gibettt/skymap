import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { hashPasswordAsync } from "@ephemeris/auth/session";
import { transaction } from "@ephemeris/db";
import { uuidSchema } from "@ephemeris/db/validators/common";
import { resetPasswordSchema } from "@ephemeris/db/validators/user";

export async function POST(request, { params }) {
  try {
    await assertSameOrigin(request);
    const actor = await requirePermission("admin.users", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid user ID");
    const parsed = resetPasswordSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw new ApiError(400, "The password must be 8 to 128 characters.");

    const passwordHash = await hashPasswordAsync(parsed.data.password);
    const user = await transaction(async (client) => {
      const { rows } = await client.query(
        "UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING id, email, role",
        [parsedId.data, passwordHash],
      );
      if (!rows[0]) return null;
      await writeAudit(client, {
        actorId: actor.id,
        action: "user.password_reset",
        entityType: "user",
        entityId: rows[0].id,
        afterData: { email: rows[0].email, role: rows[0].role },
        request,
      });
      return rows[0];
    });

    if (!user) throw new ApiError(404, "User not found");
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
