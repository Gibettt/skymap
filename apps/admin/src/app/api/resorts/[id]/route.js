import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function GET(request, { params }) {
  try {
    await requireUser(['admin']);
    const { id } = await params;

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
    const body = await parseJsonBody(request);

    const { rows: currentRows } = await query('SELECT * FROM resorts WHERE id = $1', [id]);
    if (!currentRows[0]) {
      return Response.json({ error: 'Resort tidak ditemukan.' }, { status: 404 });
    }
    const current = currentRows[0];

    const name = body.name !== undefined ? String(body.name).trim() : current.name;
    const code = body.code !== undefined ? String(body.code).trim().toUpperCase() : current.code;
    const location = body.location !== undefined ? String(body.location).trim() : current.location;
    const timezone = body.timezone !== undefined ? String(body.timezone).trim() : current.timezone;
    const contactName = body.contactName !== undefined || body.contact_name !== undefined ? String(body.contactName || body.contact_name || '').trim() : current.contact_name;
    const contactPhone = body.contactPhone !== undefined || body.contact_phone !== undefined ? String(body.contactPhone || body.contact_phone || '').trim() : current.contact_phone;
    const observationSpots = body.observationSpots !== undefined || body.observation_spots !== undefined ? String(body.observationSpots || body.observation_spots || '').trim() : current.observation_spots;
    const latitude = body.latitude !== undefined && Number.isFinite(Number(body.latitude)) ? Number(body.latitude) : current.latitude;
    const longitude = body.longitude !== undefined && Number.isFinite(Number(body.longitude)) ? Number(body.longitude) : current.longitude;
    const status = body.status !== undefined ? (body.status === 'suspended' ? 'suspended' : 'active') : current.status;

    const { rows } = await query(`
      UPDATE resorts
      SET name = $1, code = $2, location = $3, timezone = $4, contact_name = $5,
          contact_phone = $6, observation_spots = $7, latitude = $8, longitude = $9, status = $10,
          updated_at = now()
      WHERE id = $11
      RETURNING *
    `, [name, code, location, timezone, contactName, contactPhone, observationSpots, latitude, longitude, status, id]);

    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'resort.update',
      targetTable: 'resorts',
      targetId: id,
      details: { name, code, status },
    });

    return Response.json({ resort: rows[0] });
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

    const { rows: bookingRows } = await query('SELECT COUNT(*) FROM bookings WHERE resort_id = $1', [id]);
    if (Number(bookingRows[0]?.count || 0) > 0) {
      // If there are bookings, soft-deactivate rather than foreign key fail
      await query("UPDATE resorts SET status = 'suspended', updated_at = now() WHERE id = $1", [id]);
      await writeAudit({
        actorId: user.id,
        actorRole: user.role,
        action: 'resort.suspend',
        targetTable: 'resorts',
        targetId: id,
        details: { reason: 'Has existing bookings, suspended instead of hard delete' },
      });
      return Response.json({ success: true, message: 'Resort dinonaktifkan karena memiliki riwayat reservasi.' });
    }

    await query('DELETE FROM resorts WHERE id = $1', [id]);
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'resort.delete',
      targetTable: 'resorts',
      targetId: id,
      details: {},
    });

    return Response.json({ success: true, message: 'Resort berhasil dihapus.' });
  } catch (error) {
    return jsonError(error);
  }
}
