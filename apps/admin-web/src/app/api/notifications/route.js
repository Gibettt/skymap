import { assertSameOrigin, ApiError, jsonError, parseJsonBody, requirePermission } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';

import {
  countUnreadAdminNotifications,
  selectAdminNotifications,
  syncAdminNotifications,
} from '@/lib/admin-notifications';

export async function GET(request) {
  try {
    const user = await requirePermission('admin.notifications', ['admin']);
    const requestedLimit = Number(new URL(request.url).searchParams.get('limit') || 100);
    const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100;
    const result = await transaction(async (client) => {
      await syncAdminNotifications(client);
      const [notifications, unreadCount] = await Promise.all([
        selectAdminNotifications(client, user.id, limit),
        countUnreadAdminNotifications(client, user.id),
      ]);
      return { notifications, unreadCount };
    });

    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('admin.notifications', ['admin'], { write: true });
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
      throw new ApiError(400, 'Invalid notification ID');
    }

    const markUnread = body.markUnread === true || body.read === false;

    const { rows } = await transaction(async (client) => client.query(
      `UPDATE notifications
       SET read_at = CASE WHEN $3::boolean THEN NULL ELSE COALESCE(read_at, now()) END
       WHERE recipient_user_id = $1
         AND id = ANY($2::uuid[])
       RETURNING id, read_at`,
      [user.id, cleanIds, markUnread]
    ));

    return Response.json({ notifications: rows });
  } catch (error) {
    return jsonError(error);
  }
}
