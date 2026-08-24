import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { updateObservationSpotsSchema } from '@ephemeris/db/validators/resort';

function mapSetting(row) {
  if (!row) return null;
  return {
    name: row.name,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    timezone: row.timezone,
    observationSpots: row.observation_spots || '',
  };
}

export async function GET() {
  try {
    const user = await requireUser(['internal']);
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const { rows } = await query(
      'SELECT name, latitude, longitude, timezone, observation_spots FROM resorts WHERE id = $1',
      [user.resort_id]
    );
    return Response.json({ location: mapSetting(rows[0]) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['internal']);
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const parsed = updateObservationSpotsSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data pengaturan langit tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const setting = await transaction(async (client) => {
      const before = await client.query('SELECT * FROM resorts WHERE id = $1', [user.resort_id]);
      const { rows } = await client.query(
        `UPDATE resorts SET observation_spots = $2
         WHERE id = $1
         RETURNING name, latitude, longitude, timezone, observation_spots`,
        [user.resort_id, parsed.data.observationSpots]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'resort.observation_spots.update',
        entityType: 'resort',
        entityId: user.resort_id,
        beforeData: before.rows[0],
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    return Response.json({ location: mapSetting(setting) });
  } catch (error) {
    return jsonError(error);
  }
}
