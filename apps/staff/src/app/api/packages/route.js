import { jsonError, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function GET() {
  try {
    await requireUser(['internal', 'external']);
    await query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_data bytea');
    await query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_mime_type text');
    await query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_file_name text');
    const { rows } = await query(`
      SELECT
        id, name, package_type, experience_type, location, description,
        adult_price_usd, child_price_usd, child_age_range, is_active,
        image_mime_type, image_file_name, image_data IS NOT NULL AS has_image,
        CASE WHEN image_data IS NULL THEN NULL ELSE '/api/packages/' || id || '/image' END AS image_url,
        created_at, updated_at
      FROM packages
      WHERE is_active = true
      ORDER BY name
    `);
    return Response.json({ packages: rows });
  } catch (error) {
    return jsonError(error);
  }
}
