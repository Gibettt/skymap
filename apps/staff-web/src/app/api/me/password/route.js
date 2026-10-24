import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from "@ephemeris/auth";
import { hashPasswordAsync, verifyPassword } from "@ephemeris/auth/session";
import { query, transaction } from "@ephemeris/db";
import { changePasswordSchema } from "@ephemeris/db/validators/user";

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(["internal", "external"]);
    const parsed = changePasswordSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid password.");

    const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
    if (!rows[0] || !verifyPassword(parsed.data.currentPassword, rows[0].password_hash)) {
      throw new ApiError(400, "Your current password is incorrect.");
    }

    const passwordHash = await hashPasswordAsync(parsed.data.newPassword);
    await transaction(async (client) => {
      await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [user.id, passwordHash]);
      await writeAudit(client, {
        actorId: user.id,
        action: "user.password_change",
        entityType: "user",
        entityId: user.id,
        afterData: { email: user.email, role: user.role },
        request,
      });
    });

    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
