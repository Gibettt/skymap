import { jsonError, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function GET() {
  try {
    await requireUser(['admin']);
    const { rows } = await query(
      `SELECT
        pr.*,
        u.name AS requester_name,
        u.email AS requester_email,
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
          WHEN 'approved' THEN 1
          WHEN 'paid' THEN 2
          ELSE 3
        END,
        pr.created_at DESC`
    );
    return Response.json({ requests: rows });
  } catch (error) {
    return jsonError(error);
  }
}
