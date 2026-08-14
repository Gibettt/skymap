const AUDIT_EXCLUDE_FIELDS = new Set([
  'password_hash',
  'add_ons',
]);

function sanitizeAuditData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !AUDIT_EXCLUDE_FIELDS.has(key))
  );
}

export async function writeAudit(client, { actorId, action, entityType, entityId, beforeData, afterData, request }) {
  const ip = request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  const userAgent = request?.headers.get('user-agent') || null;
  await client.query(
    `INSERT INTO audit_logs
      (actor_id, action, entity_type, entity_id, before_data, after_data, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8)`,
    [
      actorId || null,
      action,
      entityType,
      entityId || null,
      beforeData ? JSON.stringify(sanitizeAuditData(beforeData)) : null,
      afterData ? JSON.stringify(sanitizeAuditData(afterData)) : null,
      ip,
      userAgent,
    ]
  );
}
