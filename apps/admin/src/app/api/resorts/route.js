import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function GET() {
  try {
    await requireUser(['admin']);
    const { rows } = await query(`
      SELECT 
        r.*,
        COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'active') AS active_staff_count,
        COUNT(DISTINCT b.id) AS total_bookings_count
      FROM resorts r
      LEFT JOIN users u ON u.resort_id = r.id
      LEFT JOIN bookings b ON b.resort_id = r.id
      GROUP BY r.id
      ORDER BY r.name ASC
    `);

    return Response.json({ resorts: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const body = await parseJsonBody(request);

    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim().toUpperCase();
    const location = String(body.location || '').trim();
    const timezone = String(body.timezone || 'Indian/Maldives').trim();
    const contactName = String(body.contactName || body.contact_name || '').trim();
    const contactPhone = String(body.contactPhone || body.contact_phone || '').trim();
    const observationSpots = String(body.observationSpots || body.observation_spots || 'Sunset Beach, Helipad, Main Jetty').trim();
    const latitude = Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : 5.2893;
    const longitude = Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : 73.5358;
    const status = body.status === 'suspended' ? 'suspended' : 'active';

    if (!name || !code) {
      return Response.json({ error: 'Nama resort dan kode resort wajib diisi.' }, { status: 400 });
    }

    const { rows } = await query(`
      INSERT INTO resorts (name, code, location, timezone, contact_name, contact_phone, observation_spots, latitude, longitude, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, code, location, timezone, contactName, contactPhone, observationSpots, latitude, longitude, status]);

    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'resort.create',
      targetTable: 'resorts',
      targetId: rows[0].id,
      details: { name, code, location },
    });

    return Response.json({ resort: rows[0] }, { status: 201 });
  } catch (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Kode resort sudah terdaftar, gunakan kode lain.' }, { status: 409 });
    }
    return jsonError(error);
  }
}
