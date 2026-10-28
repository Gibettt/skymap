// Reusable notification writer helper for event handlers

export async function insertNotification(clientOrPool, {
  recipientUserId,
  type,
  sourceTable,
  sourceId,
  title,
  message,
  meta,
  link,
  // Refreshing a notice (e.g. a newer reminder) shows it again as unread at the top.
  markUnread = false,
}) {
  if (!recipientUserId) return null;

  try {
    const { rows } = await clientOrPool.query(
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
        title = EXCLUDED.title,
        message = EXCLUDED.message,
        meta = EXCLUDED.meta,
        link = EXCLUDED.link${markUnread ? ', read_at = NULL, created_at = now()' : ''}
      RETURNING id`,
      [
        recipientUserId,
        type,
        sourceTable,
        sourceId,
        title,
        message,
        meta || null,
        link || null,
      ]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('[events:notification] Failed to insert notification:', error);
    return null;
  }
}
