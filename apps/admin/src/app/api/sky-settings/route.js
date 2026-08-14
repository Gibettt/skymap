import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { updateSkySettingsSchema } from '@ephemeris/db/validators/sky-settings';
import { validateResortLocation } from '@ephemeris/sky';

const DEFAULT_LOCATION = {
  name: 'Jakarta, Indonesia',
  latitude: -6.2088,
  longitude: 106.8456,
  timezone: 'Asia/Jakarta',
};

function mapSetting(row) {
  if (!row) return DEFAULT_LOCATION;
  return {
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    timezone: row.timezone,
  };
}

export async function GET() {
  try {
    const { rows } = await query('SELECT name, latitude, longitude, timezone FROM sky_app_settings WHERE id = true');
    return Response.json({ location: mapSetting(rows[0]) });
  } catch {
    return Response.json({ location: DEFAULT_LOCATION });
  }
}

export async function PUT(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const parsed = updateSkySettingsSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data pengaturan langit tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const { name, timezone } = parsed.data;
    const { latitude, longitude } = validateResortLocation(parsed.data);

    const setting = await transaction(async (client) => {
      const before = await client.query('SELECT * FROM sky_app_settings WHERE id = true');
      const { rows } = await client.query(
        `INSERT INTO sky_app_settings (id, name, latitude, longitude, timezone)
         VALUES (true, $1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude, timezone = EXCLUDED.timezone
         RETURNING name, latitude, longitude, timezone`,
        [name, latitude, longitude, timezone]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky.settings.update',
        entityType: 'sky_app_settings',
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
