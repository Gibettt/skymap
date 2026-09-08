import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { hashPassword } from '@ephemeris/auth/session';
import { query, transaction } from '@ephemeris/db';
import { presenceStatus } from '@ephemeris/db/presence';
import { createStaffSchema } from '@ephemeris/db/validators/user';

export async function GET() {
  try {
    await requirePermission('admin.users', ['admin']);
    const [users, resorts] = await Promise.all([
      query(`SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.resort_id,
                    u.created_at, u.last_seen_at, u.last_active_at,
                    r.name AS resort_name, r.location AS resort_location,
                    COUNT(b.id)::int AS total_booking
             FROM users u
             LEFT JOIN resorts r ON r.id = u.resort_id
             LEFT JOIN bookings b ON b.staff_id = u.id
             GROUP BY u.id, r.id
             ORDER BY u.created_at DESC`),
      query(`SELECT id, name, location, status FROM resorts ORDER BY name`),
    ]);
    const now = Date.now();
    return Response.json({
      users: users.rows.map((user) => {
        let presence = null;
        if (['internal', 'external'].includes(user.role)) {
          presence = user.status === 'active'
            ? presenceStatus({ lastSeenAt: user.last_seen_at, lastActiveAt: user.last_active_at }, now)
            : 'offline';
        }
        return { ...user, presence };
      }),
      resorts: resorts.rows,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const actor = await requirePermission('admin.users', ['admin'], { write: true });
    const parsed = createStaffSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Invalid staff data', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const staff = await transaction(async (client) => {
      const resort = await client.query('SELECT id FROM resorts WHERE id = $1 FOR UPDATE', [data.resortId]);
      if (!resort.rows[0]) throw new ApiError(400, 'Resort not found');

      const { rows } = await client.query(
        `INSERT INTO users (name, email, phone, role, status, resort_id, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, email, phone, role, status, resort_id, created_at`,
        [data.name, data.email, data.phone || null, data.role, data.status, data.resortId, hashPassword(data.password)]
      );
      await writeAudit(client, {
        actorId: actor.id,
        action: 'user.create',
        entityType: 'user',
        entityId: rows[0].id,
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    return Response.json({ user: staff }, { status: 201 });
  } catch (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'This email is already used by another account.' }, { status: 409 });
    }
    return jsonError(error);
  }
}
