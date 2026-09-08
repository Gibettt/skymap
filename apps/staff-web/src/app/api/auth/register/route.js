import {
  ApiError,
  assertSameOrigin,
  enforceRegistrationRateLimit,
  jsonError,
  parseJsonBody,
  writeAudit,
} from "@ephemeris/auth";
import { hashPasswordAsync } from "@ephemeris/auth/session";
import { query, transaction } from "@ephemeris/db";
import { externalRegistrationSchema } from "@ephemeris/db/validators/user";

export async function GET() {
  try {
    const { rows } = await query(
      `SELECT id, name, code, location
       FROM resorts
       WHERE status = 'active'
       ORDER BY name ASC`,
    );

    return Response.json({ resorts: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request, { requireOrigin: true });
    const parsed = externalRegistrationSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Invalid registration data", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    await enforceRegistrationRateLimit(request, data.email);
    const passwordHash = await hashPasswordAsync(data.password);
    const user = await transaction(async (client) => {
      const resortResult = await client.query(
        `SELECT id
         FROM resorts
         WHERE id = $1 AND status = 'active'
         FOR UPDATE`,
        [data.resortId],
      );
      if (!resortResult.rows[0]) {
        throw new ApiError(400, "The selected resort is not available");
      }

      const roleResult = await client.query(
        `SELECT id
         FROM access_roles
         WHERE is_system = true
           AND base_role = 'external'
           AND status = 'active'
         ORDER BY created_at, id
         LIMIT 1`,
      );
      if (!roleResult.rows[0]) {
        throw new ApiError(503, "External staff registration is temporarily unavailable");
      }

      const { rows } = await client.query(
        `INSERT INTO users
          (name, email, phone, role, status, resort_id, access_role_id, password_hash)
         VALUES ($1, $2, $3, 'external', 'inactive', $4, $5, $6)
         RETURNING id, name, email, phone, role, status, resort_id, created_at`,
        [data.name, data.email, data.phone || null, data.resortId, roleResult.rows[0].id, passwordHash],
      );

      await writeAudit(client, {
        actorId: null,
        action: "auth.register",
        entityType: "user",
        entityId: rows[0].id,
        afterData: rows[0],
        request,
      });

      return rows[0];
    });

    return Response.json({ user, registrationStatus: "pending_approval" }, { status: 201 });
  } catch (error) {
    if (error.code === "23505") {
      return Response.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    return jsonError(error);
  }
}
