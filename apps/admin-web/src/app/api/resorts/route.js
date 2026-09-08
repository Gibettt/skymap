import { assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { resortCoverageStatus } from '@ephemeris/db/resort-coverage';
import { resortSchema } from '@ephemeris/db/validators/resort';

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET() {
  try {
    await requirePermission('admin.resorts', ['admin']);
    const { rows } = await query(`
      SELECT
        r.*,
        (SELECT COUNT(*)::int FROM users u
          WHERE u.resort_id = r.id AND u.status = 'active' AND u.role IN ('internal', 'external')) AS active_staff_count,
        (SELECT COUNT(*)::int FROM users u
          WHERE u.resort_id = r.id AND u.status = 'active' AND u.role = 'internal') AS active_internal_count,
        (SELECT COUNT(*)::int FROM users u
          WHERE u.resort_id = r.id AND u.status = 'active' AND u.role = 'external') AS active_external_count,
        (SELECT COUNT(*)::int FROM bookings b WHERE b.resort_id = r.id) AS total_bookings_count,
        (SELECT COUNT(*)::int FROM bookings b
          WHERE b.resort_id = r.id AND b.status IN ('pending', 'active', 'rescheduled')) AS open_bookings_count
      FROM resorts r
      ORDER BY r.name ASC
    `);

    return Response.json({
      resorts: rows.map((resort) => ({
        ...resort,
        coverage_status: resortCoverageStatus({
          resortStatus: resort.status,
          activeInternalCount: resort.active_internal_count,
          activeExternalCount: resort.active_external_count,
        }),
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('admin.resorts', ['admin'], { write: true });
    const parsed = resortSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) return Response.json({ error: 'Invalid resort data', details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const resort = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO resorts (
           name, code, slug, location, timezone, contact_name, contact_phone,
           contact_email, whatsapp_number, observation_spots, latitude, longitude, status
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [data.name, data.code.toUpperCase(), data.slug || slugify(data.name), data.location, data.timezone,
         data.contactName, data.contactPhone, data.contactEmail, data.whatsappNumber, data.observationSpots,
         data.latitude, data.longitude, 'inactive']
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
      return Response.json({ error: 'This resort code is already registered. Use a different code.' }, { status: 409 });
    }
    return jsonError(error);
  }
}
