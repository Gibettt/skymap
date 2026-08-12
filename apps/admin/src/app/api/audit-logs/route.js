import { jsonError, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function GET(request) {
  try {
    await requireUser(['admin']);
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || 100), 200);
    const { rows } = await query(
      `SELECT
        al.*,
        u.name AS actor_name,
        u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return Response.json({ auditLogs: rows });
  } catch (error) {
    return jsonError(error);
  }
}
