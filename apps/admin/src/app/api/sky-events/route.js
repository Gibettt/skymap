import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { createSkyEventSchema } from '@ephemeris/db/validators/sky-event';
import { calculatedSkyEvents } from '@ephemeris/sky';
import { filterPublicEvents, normalizeSkyEventInput } from '@ephemeris/sky';

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
    isPublished: row.is_published,
    calculated: false,
  };
}

function dates(request) {
  const url = new URL(request.url);
  const today = new Date();
  const fallbackFrom = today.toISOString().slice(0, 10);
  const fallbackTo = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);
  const from = url.searchParams.get('from') || fallbackFrom;
  const to = url.searchParams.get('to') || fallbackTo;
  if (Number.isNaN(new Date(`${from}T00:00:00Z`).getTime()) || Number.isNaN(new Date(`${to}T00:00:00Z`).getTime()) || from > to) {
    throw new Error('Invalid date range');
  }
  return { from, to, admin: url.searchParams.get('scope') === 'admin' };
}

async function location() {
  try {
    const { rows } = await query('SELECT latitude, longitude FROM sky_app_settings WHERE id = true');
    return rows[0] ? { latitude: Number(rows[0].latitude), longitude: Number(rows[0].longitude) } : FALLBACK_LOCATION;
  } catch {
    return FALLBACK_LOCATION;
  }
}

export async function GET(request) {
  try {
    const { from, to, admin } = dates(request);
    if (admin) await requireUser(['admin']);
    let rows = [];
    try {
      const result = await query(
        `SELECT * FROM sky_events
         WHERE ($1::boolean OR is_published = true)
           AND starts_at >= $2::timestamptz
           AND starts_at < ($3::date + INTERVAL '1 day')
         ORDER BY starts_at ASC`,
        [admin, from, to]
      );
      rows = result.rows;
    } catch {
      rows = [];
    }

    const stored = rows.map(mapEvent);
    if (admin) return Response.json({ events: stored });

    const resort = await location();
    const calculated = calculatedSkyEvents({ from, to, ...resort });
    const events = filterPublicEvents([...stored, ...calculated], from, to)
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
    return Response.json({ events });
  } catch (error) {
    if (error?.status) return jsonError(error);
    return Response.json({ error: 'Invalid calendar request' }, { status: 400 });
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const parsed = createSkyEventSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data sky event tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const event = normalizeSkyEventInput(parsed.data);
    const created = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO sky_events
          (title, event_type, starts_at, ends_at, description, source_name, source_url, visibility, is_published, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
         RETURNING *`,
        [event.title, event.eventType, event.startsAt, event.endsAt, event.description, event.sourceName, event.sourceUrl, event.visibility, event.isPublished, user.id]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.create',
        entityType: 'sky_event',
        entityId: rows[0].id,
        afterData: rows[0],
        request,
      });
      return rows[0];
    });
    return Response.json({ event: mapEvent(created) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
