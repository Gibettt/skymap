import { query } from '@ephemeris/db';

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
