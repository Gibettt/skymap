import { jsonError, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function GET() {
  try {
    const user = await requireUser();
    const { rows } = await query(`
      SELECT id, name, code, location, timezone, observation_spots, contact_name, contact_phone, latitude, longitude, status
      FROM resorts
      WHERE status = 'active'
      ORDER BY name ASC
    `);

    let myResort = null;
    if (user.resort_id) {
      myResort = rows.find((r) => r.id === user.resort_id) || null;
    }

    return Response.json({
      resorts: rows,
      myResort,
    });
  } catch (error) {
    return jsonError(error);
  }
}
