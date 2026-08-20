import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { resortSchema } from '@ephemeris/db/validators/resort';

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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
    const parsed = resortSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) return Response.json({ error: 'Data resort tidak valid', details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const resort = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO resorts (
           name, code, slug, location, timezone, contact_name, contact_phone,
           contact_email, whatsapp_number, observation_spots, latitude, longitude, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [data.name, data.code.toUpperCase(), data.slug || slugify(data.name), data.location, data.timezone,
         data.contactName, data.contactPhone, data.contactEmail, data.whatsappNumber, data.observationSpots,
         data.latitude, data.longitude, data.status]
      );
      await writeAudit(client, {
        actorId: user.id, action: 'resort.create', entityType: 'resort', entityId: rows[0].id,
        afterData: rows[0], request,
      });
      return rows[0];
    });

    return Response.json({ resort }, { status: 201 });
  } catch (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Kode resort sudah terdaftar, gunakan kode lain.' }, { status: 409 });
    }
    return jsonError(error);
  }
}
