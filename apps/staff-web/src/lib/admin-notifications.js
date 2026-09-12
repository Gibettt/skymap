import "server-only";

export async function syncAdminNotifications(client) {
  await client.query(
    `INSERT INTO notifications (
      recipient_user_id, type, source_table, source_id, title, message, meta, link, created_at
    )
    SELECT
      admin_user.id,
      'booking',
      'bookings',
      b.id,
      CONCAT('New booking from ', UPPER(LEFT(staff.role::text, 1)), LOWER(SUBSTRING(staff.role::text, 2)), ' staff'),
      CONCAT(b.booking_code, ' - ', b.guest_name, COALESCE(CONCAT(', ', p.name), '')),
      CONCAT(COALESCE(staff.name, 'Staff'), ' · ', b.event_date),
      '/dashboard/admin/bookings',
      b.created_at
    FROM bookings b
    JOIN packages p ON p.id = b.package_id
    JOIN users staff ON staff.id = b.staff_id
    JOIN users admin_user ON admin_user.role = 'admin' AND admin_user.status = 'active'
    WHERE b.created_at >= now() - interval '30 days'
    ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
      title = EXCLUDED.title,
      message = EXCLUDED.message,
      meta = EXCLUDED.meta,
      link = EXCLUDED.link
    WHERE notifications.title IS DISTINCT FROM EXCLUDED.title
      OR notifications.message IS DISTINCT FROM EXCLUDED.message
      OR notifications.meta IS DISTINCT FROM EXCLUDED.meta
      OR notifications.link IS DISTINCT FROM EXCLUDED.link`,
  );

  await client.query(
    `INSERT INTO notifications (
      recipient_user_id, type, source_table, source_id, title, message, meta, link, created_at
    )
    SELECT
      admin_user.id,
      'payout',
      'payout_requests',
      pr.id,
      CONCAT('New payout request from ', UPPER(LEFT(requester.role::text, 1)), LOWER(SUBSTRING(requester.role::text, 2)), ' staff'),
      CONCAT(COALESCE(requester.name, 'Staff'), ' requested $', pr.amount_usd),
      COALESCE(r.name, 'Internal observatory'),
      '/dashboard/admin/finance?tab=payouts',
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
      link = EXCLUDED.link
    WHERE notifications.title IS DISTINCT FROM EXCLUDED.title
      OR notifications.message IS DISTINCT FROM EXCLUDED.message
      OR notifications.meta IS DISTINCT FROM EXCLUDED.meta
      OR notifications.link IS DISTINCT FROM EXCLUDED.link`,
  );
}

export async function selectAdminNotifications(client, userId, limit = 200) {
  const { rows } = await client.query(
    `SELECT id, type, source_table, source_id, title, message, meta, link,
      read_at, created_at, updated_at
    FROM notifications
    WHERE recipient_user_id = $1
    ORDER BY CASE WHEN read_at IS NULL THEN 0 ELSE 1 END, created_at DESC
    LIMIT $2`,
    [userId, limit],
  );

  return rows.map((notification) => ({
    ...notification,
    read_at: notification.read_at ? new Date(notification.read_at).toISOString() : null,
    created_at: new Date(notification.created_at).toISOString(),
    updated_at: new Date(notification.updated_at).toISOString(),
  }));
}

export async function countUnreadAdminNotifications(client, userId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS unread_count
    FROM notifications
    WHERE recipient_user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return rows[0]?.unread_count || 0;
}
