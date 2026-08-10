import { assertSameOrigin, jsonError, requireUser, writeAudit } from '@/lib/auth';
import { query, transaction } from '@/lib/db';
import { validateResortLocation } from '@/lib/sky-events.mjs';

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
    const body = await request.json();
    const name = String(body.name || '').trim();
    const timezone = String(body.timezone || '').trim();
    const { latitude, longitude } = validateResortLocation(body);

    if (!name || name.length > 120 || !timezone || timezone.length > 64) {
      return Response.json({ error: 'Invalid location settings' }, { status: 400 });
    }

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
