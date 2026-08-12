import { jsonError, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function GET() {
  try {
    await requireUser(['internal', 'external']);
    const { rows } = await query('SELECT * FROM packages WHERE is_active = true ORDER BY name');
    return Response.json({ packages: rows });
  } catch (error) {
    return jsonError(error);
  }
}
