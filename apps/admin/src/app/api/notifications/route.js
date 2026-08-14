import { assertSameOrigin, ApiError, jsonError, parseJsonBody, requireUser } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';

async function syncAdminNotifications(client) {
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
      admin_user.id,
      'booking',
      'bookings',
      b.id,
      'Booking baru dari staff ' || CASE WHEN staff.role = 'internal' THEN 'Internal' ELSE 'External' END,
      b.booking_code || ' - ' || b.guest_name || COALESCE(', ' || p.name, ''),
      COALESCE(staff.name, 'Staff') || ' - ' || to_char(b.event_date, 'DD Mon'),
      '/dashboard/admin/bookings',
      b.created_at
    FROM bookings b
    JOIN packages p ON p.id = b.package_id
    JOIN users staff ON staff.id = b.staff_id
    JOIN users admin_user ON admin_user.role = 'admin' AND admin_user.status = 'active'
    WHERE b.status = 'pending_review'
    ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
      title = EXCLUDED.title,
      message = EXCLUDED.message,
      meta = EXCLUDED.meta,
      link = EXCLUDED.link`
  );

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
      admin_user.id,
      'payout',
      'payout_requests',
      pr.id,
      'Payout staff ' || CASE WHEN requester.role = 'internal' THEN 'Internal' ELSE 'External' END,
      COALESCE(requester.name, 'Staff') || ' meminta pencairan $' || to_char(pr.amount_usd, 'FM999999990.00'),
      COALESCE(r.name, 'Internal observatorium'),
      '/dashboard/admin/keuangan?tab=pencairan',
      pr.created_at
    FROM payout_requests pr
    JOIN users requester ON requester.id = pr.requester_id
    LEFT JOIN resorts r ON r.id = pr.resort_id
    JOIN users admin_user ON admin_user.role = 'admin' AND admin_user.status = 'active'
    WHERE pr.status = 'requested'
    ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
      title = EXCLUDED.title,
      message = EXCLUDED.message,
      meta = EXCLUDED.meta,
      link = EXCLUDED.link`
  );
}

export async function GET() {
  try {
    const user = await requireUser(['admin']);
    const notifications = await transaction(async (client) => {
      await syncAdminNotifications(client);
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
            (n.type = 'booking' AND EXISTS (
              SELECT 1 FROM bookings b
              WHERE b.id = n.source_id AND b.status = 'pending_review'
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
    const user = await requireUser(['admin']);
    const body = await parseJsonBody(request);
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
