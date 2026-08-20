import { jsonError, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function GET() {
  try {
    const user = await requireUser(['internal', 'external']);
    if (!user.resort_id) return Response.json({ error: 'Staff resort profile is not configured' }, { status: 403 });
    const { rows } = await query(`
      SELECT
        id, name, package_type, experience_type, location, description, schedule,
        adult_price_usd, child_price_usd, child_age_range, is_chargeable, is_active,
        image_mime_type, image_file_name, image_data IS NOT NULL AS has_image,
        CASE WHEN image_data IS NULL THEN NULL ELSE '/api/packages/' || id || '/image' END AS image_url,
        COALESCE((
          SELECT json_agg(pi.label ORDER BY pi.sort_order)
          FROM package_inclusions pi
          WHERE pi.package_id = p.id AND pi.is_active = true
        ), '[]'::json) AS inclusions,
        created_at, updated_at
      FROM packages p
      WHERE p.is_active = true AND p.resort_id = $1
      ORDER BY p.name
    `, [user.resort_id]);
    return Response.json({ packages: rows });
  } catch (error) {
    return jsonError(error);
  }
}
