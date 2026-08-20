import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { updateResortSchema } from '@ephemeris/db/validators/resort';

function slugify(value) {
  return String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(request, { params }) {
  try {
    await requireUser(['admin']);
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });

    const { rows } = await query('SELECT * FROM resorts WHERE id = $1', [id]);
    if (!rows[0]) {
      return Response.json({ error: 'Resort tidak ditemukan.' }, { status: 404 });
    }

    const { rows: staffRows } = await query(`
      SELECT id, name, email, phone, role, status, created_at
      FROM users
      WHERE resort_id = $1
      ORDER BY name ASC
    `, [id]);

    const { rows: recentBookings } = await query(`
      SELECT b.id, b.booking_code, b.event_date, b.time_start, b.time_end, b.status, b.adult_count, b.child_count,
             p.name AS package_name, u.name AS staff_name
      FROM bookings b
      JOIN packages p ON p.id = b.package_id
      JOIN users u ON u.id = b.staff_id
      WHERE b.resort_id = $1
      ORDER BY b.event_date DESC, b.created_at DESC
      LIMIT 10
    `, [id]);

    return Response.json({
      resort: rows[0],
      staff: staffRows,
      recentBookings,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const parsed = updateResortSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) return Response.json({ error: 'Data resort tidak valid', details: parsed.error.flatten() }, { status: 400 });

    const resort = await transaction(async (client) => {
      const currentResult = await client.query('SELECT * FROM resorts WHERE id = $1 FOR UPDATE', [id]);
      const current = currentResult.rows[0];
      if (!current) return null;
      const body = parsed.data;
      const name = body.name ?? current.name;
      const { rows } = await client.query(
        `UPDATE resorts SET
           name=$2, code=$3, slug=$4, location=$5, timezone=$6, contact_name=$7,
           contact_phone=$8, contact_email=$9, whatsapp_number=$10, observation_spots=$11,
           latitude=$12, longitude=$13, status=$14
         WHERE id=$1 RETURNING *`,
        [id, name, (body.code ?? current.code).toUpperCase(), body.slug ?? current.slug ?? slugify(name),
         body.location ?? current.location, body.timezone ?? current.timezone,
         body.contactName ?? current.contact_name, body.contactPhone ?? current.contact_phone,
         body.contactEmail === undefined ? current.contact_email : body.contactEmail,
         body.whatsappNumber ?? current.whatsapp_number, body.observationSpots ?? current.observation_spots,
         body.latitude ?? current.latitude, body.longitude ?? current.longitude, body.status ?? current.status]
      );
      await writeAudit(client, {
        actorId: user.id, action: 'resort.update', entityType: 'resort', entityId: id,
        beforeData: current, afterData: rows[0], request,
      });
      return rows[0];
    });
    if (!resort) return Response.json({ error: 'Resort tidak ditemukan.' }, { status: 404 });
    return Response.json({ resort });
  } catch (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Kode resort sudah digunakan oleh resort lain.' }, { status: 409 });
    }
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id } = await params;
    if (!uuidSchema.safeParse(id).success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const result = await transaction(async (client) => {
      const beforeResult = await client.query('SELECT * FROM resorts WHERE id = $1 FOR UPDATE', [id]);
      if (!beforeResult.rows[0]) return null;
      const { rows } = await client.query("UPDATE resorts SET status = 'inactive' WHERE id = $1 RETURNING *", [id]);
      await writeAudit(client, {
        actorId: user.id, action: 'resort.deactivate', entityType: 'resort', entityId: id,
        beforeData: beforeResult.rows[0], afterData: rows[0], request,
      });
      return rows[0];
    });
    if (!result) return Response.json({ error: 'Resort tidak ditemukan.' }, { status: 404 });
    return Response.json({ success: true, resort: result, message: 'Resort dinonaktifkan.' });
  } catch (error) {
    return jsonError(error);
  }
}
