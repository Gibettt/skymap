import { assertSameOrigin, ApiError, jsonError, parseJsonBody, requireUser } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await transaction(async (client) => {
      const { rows } = await client.query(
        `SELECT
          n.id,
          n.type,
          n.source_table,
          n.source_id,
          n.title,
          n.message,
          n.meta,
          n.link,
          n.read_at,
          n.created_at
        FROM notifications n
        WHERE n.recipient_user_id = $1
        ORDER BY
          CASE WHEN n.read_at IS NULL THEN 0 ELSE 1 END,
          n.created_at DESC
        LIMIT 30`,
        [user.id]
      );
      return rows;
    });

    return Response.json({ notifications });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();
    const body = await parseJsonBody(request);

    if (body.markAll || body.all) {
      const { rows } = await transaction(async (client) => client.query(
        `UPDATE notifications
         SET read_at = COALESCE(read_at, now())
         WHERE recipient_user_id = $1
           AND read_at IS NULL
         RETURNING id, read_at`,
        [user.id]
      ));
      return Response.json({ notifications: rows, markedAll: true });
    }

    const ids = Array.isArray(body.ids) ? body.ids : [body.id];
    const cleanIds = ids
      .map((id) => String(id || '').trim())
      .filter(Boolean)
      .slice(0, 50);

    if (!cleanIds.length) {
      throw new ApiError(400, 'Notification id is required');
    }
    if (cleanIds.some((id) => !uuidSchema.safeParse(id).success)) {
      throw new ApiError(400, 'ID notifikasi tidak valid');
    }

    const { rows } = await transaction(async (client) => client.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, now())
       WHERE recipient_user_id = $1
         AND id = ANY($2::uuid[])
       RETURNING id, read_at`,
      [user.id, cleanIds]
    ));

    return Response.json({ notifications: rows });
  } catch (error) {
    return jsonError(error);
  }
}
