import { jsonError, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';
import { paginationFromRequest, paginationMeta } from '@ephemeris/db/helpers';

export async function GET(request) {
  try {
    await requireUser(['admin']);
    const pagination = paginationFromRequest(request);
    const { rows } = await query(
      `SELECT
        pr.*,
        u.name AS requester_name,
        u.email AS requester_email,
        u.role AS requester_role,
        r.name AS resort_name,
        r.code AS resort_code,
        reviewer.name AS reviewed_by_name
       FROM payout_requests pr
       JOIN users u ON u.id = pr.requester_id
       LEFT JOIN resorts r ON r.id = pr.resort_id
       LEFT JOIN users reviewer ON reviewer.id = pr.reviewed_by
       ORDER BY
        CASE pr.status
          WHEN 'requested' THEN 0
          WHEN 'processed' THEN 1
          WHEN 'completed' THEN 2
          ELSE 3
        END,
        pr.created_at DESC
       LIMIT $1 OFFSET $2`,
      [pagination.limit, pagination.offset]
    );
    const { rows: countRows } = await query('SELECT COUNT(*) FROM payout_requests');
    return Response.json({
      requests: rows,
      pagination: paginationMeta({ ...pagination, total: Number(countRows[0].count) }),
    });
  } catch (error) {
    return jsonError(error);
  }
}
