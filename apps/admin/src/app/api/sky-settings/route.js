import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { updateObservationSpotsSchema } from '@ephemeris/db/validators/resort';

function validResortId(value) {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, 'Resort wajib dipilih');
  return parsed.data;
}

function mapLocation(row) {
  return row ? {
    name: row.name,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    timezone: row.timezone,
    observationSpots: row.observation_spots || '',
  } : null;
}

export async function GET(request) {
  try {
    await requireUser(['admin']);
    const resortId = validResortId(new URL(request.url).searchParams.get('resortId'));
    const { rows } = await query(
      'SELECT name, latitude, longitude, timezone, observation_spots FROM resorts WHERE id = $1',
      [resortId]
    );
    if (!rows[0]) throw new ApiError(404, 'Resort tidak ditemukan');
    return Response.json({ location: mapLocation(rows[0]) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const body = await parseJsonBody(request);
    const resortId = validResortId(body.resortId);
    const parsed = updateObservationSpotsSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Data titik observasi tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const location = await transaction(async (client) => {
      const before = await client.query('SELECT * FROM resorts WHERE id = $1', [resortId]);
      if (!before.rows[0]) throw new ApiError(404, 'Resort tidak ditemukan');
      const { rows } = await client.query(
        `UPDATE resorts SET observation_spots = $2 WHERE id = $1
         RETURNING name, latitude, longitude, timezone, observation_spots`,
        [resortId, parsed.data.observationSpots]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'resort.observation_spots.update',
        entityType: 'resort',
        entityId: resortId,
        beforeData: before.rows[0],
        afterData: rows[0],
        request,
      });
      return rows[0];
    });
    return Response.json({ location: mapLocation(location) });
  } catch (error) {
    return jsonError(error);
  }
}
