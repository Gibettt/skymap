import { assertSameOrigin, ApiError, jsonError, parseJsonBody, requireUser } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';

async function syncStaffNotifications(client, user) {
  if (user.role === 'internal') {
    // Sinkronisasi notifikasi booking dari external staff yang statusnya masih 'pending_review'
    await client.query(
      `INSERT INTO notifications (
        recipient_user_id,
        type,
        source_table,
        source_id,
        title,
        message,
        meta,
        link,
        created_at
      )
      SELECT
        $1,
        'booking',
        'bookings',
        b.id,
        'Booking baru dari staff External',
        b.booking_code || ' - ' || b.guest_name || COALESCE(', ' || p.name, ''),
        COALESCE(staff.name, 'Staff External') || ' - ' || to_char(b.event_date, 'DD Mon'),
        '/dashboard/internal/bookings',
        b.created_at
      FROM bookings b
      JOIN packages p ON p.id = b.package_id
      JOIN users staff ON staff.id = b.staff_id
      WHERE b.status = 'pending_review' AND staff.role = 'external'
      ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
        title = EXCLUDED.title,
        message = EXCLUDED.message,
        meta = EXCLUDED.meta,
        link = EXCLUDED.link`,
      [user.id]
    );
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const notifications = await transaction(async (client) => {
      await syncStaffNotifications(client, user);

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
          AND (
            (n.type = 'booking' AND (
              EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.id = n.source_id AND b.status = 'pending_review'
              )
              OR n.read_at IS NULL
            ))
            OR
            (n.type = 'payout' AND EXISTS (
              SELECT 1 FROM payout_requests pr
              WHERE pr.id = n.source_id AND pr.status = 'requested'
            ))
          )
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
