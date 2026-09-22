import { jsonError } from '@ephemeris/auth';
import { query } from '@ephemeris/db';
import { calculatedSkyEvents, filterPublicEvents, rollingDateWindow } from '@ephemeris/sky';

const FALLBACK_LOCATION = { latitude: -6.2088, longitude: 106.8456 };

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    description: row.description || '',
    sourceName: row.source_name || '',
    sourceUrl: row.source_url || null,
    visibility: row.visibility,
    resortId: row.resort_id,
    observationSpot: row.observation_spot || '',
    capacity: row.capacity,
    priceOverrideUsd: row.price_override_usd == null ? null : Number(row.price_override_usd),
    imageUrl: row.image_data ? `/api/sky-events/${row.id}/image` : row.image_url || null,
    status: row.status,
    isPublished: row.is_published,
    calculated: false,
  };
}

function dates(request, timeZone) {
  const url = new URL(request.url);
  const window = rollingDateWindow(timeZone);
  const fallbackFrom = window.from;
  const fallbackTo = window.to;
  const from = url.searchParams.get('from') || fallbackFrom;
  const to = url.searchParams.get('to') || fallbackTo;
  if (Number.isNaN(new Date(`${from}T00:00:00Z`).getTime()) || Number.isNaN(new Date(`${to}T00:00:00Z`).getTime()) || from > to) {
    throw new Error('Invalid date range');
  }
  return { from, to };
}

async function resortForRequest(request) {
  try {
    const slug = new URL(request.url).searchParams.get('resort');
    const { rows } = await query(
      `SELECT id, latitude, longitude, timezone FROM resorts
       WHERE status = 'active' AND ($1::text IS NULL OR slug = $1)
       ORDER BY created_at LIMIT 1`,
      [slug]
    );
    return rows[0] ? {
      id: rows[0].id,
      latitude: Number(rows[0].latitude ?? FALLBACK_LOCATION.latitude),
      longitude: Number(rows[0].longitude ?? FALLBACK_LOCATION.longitude),
      timezone: rows[0].timezone || 'UTC',
    } : { ...FALLBACK_LOCATION, id: null, timezone: 'UTC' };
  } catch {
    return { ...FALLBACK_LOCATION, id: null, timezone: 'UTC' };
  }
}

export async function GET(request) {
  try {
    const resort = await resortForRequest(request);
    const { from, to } = dates(request, resort.timezone);
    let rows = [];
    try {
      const result = await query(
        `SELECT * FROM sky_events
         WHERE is_published = true
           AND status = 'published'
           AND resort_id = $1
           AND (starts_at AT TIME ZONE $2)::date BETWEEN $3::date AND $4::date
           AND COALESCE(ends_at, starts_at) >= now()
         ORDER BY starts_at ASC`,
        [resort.id, resort.timezone, from, to]
      );
      rows = result.rows;
    } catch {
      rows = [];
    }

    const stored = rows.map(mapEvent);
    const calculated = calculatedSkyEvents({ from, to, ...resort });
    const events = filterPublicEvents([...stored, ...calculated], from, to)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    return Response.json({ events });
  } catch (error) {
    if (error?.status) return jsonError(error);
    return Response.json({ error: 'Invalid calendar request' }, { status: 400 });
  }
}
