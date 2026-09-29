import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { createSkyEventSchema } from '@ephemeris/db/validators/sky-event';
import { getOfficialPresets, normalizeSkyEventInput } from '@ephemeris/sky';

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
    resortName: row.resort_name || null,
    packageId: row.package_id,
    packageName: row.package_name || null,
    observationSpot: row.observation_spot || '',
    capacity: row.capacity,
    priceOverrideUsd: row.price_override_usd == null ? null : Number(row.price_override_usd),
    imageUrl: row.image_url || null,
    status: row.status,
    isPublished: row.is_published,
  };
}

function dateRange(request) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from') || '2020-01-01';
  const to = url.searchParams.get('to') || '2035-12-31';
  if (Number.isNaN(new Date(`${from}T00:00:00Z`).getTime())
    || Number.isNaN(new Date(`${to}T00:00:00Z`).getTime())
    || from > to) {
    throw new ApiError(400, 'Rentang tanggal tidak valid');
  }
  return { from, to };
}

async function requireResort(resortId, client = { query }) {
  const parsed = uuidSchema.safeParse(resortId);
  if (!parsed.success) throw new ApiError(400, 'Resort wajib dipilih');
  const result = await client.query('SELECT id FROM resorts WHERE id = $1', [parsed.data]);
  if (!result.rows[0]) throw new ApiError(404, 'Resort tidak ditemukan');
  return parsed.data;
}

export async function GET(request) {
  try {
    await requireUser(['admin']);
    const { from, to } = dateRange(request);
    const rawResortId = new URL(request.url).searchParams.get('resortId');
    const resortId = rawResortId ? await requireResort(rawResortId) : null;
    const { rows } = await query(
      `SELECT se.*, p.name AS package_name, r.name AS resort_name
       FROM sky_events se
       JOIN resorts r ON r.id = se.resort_id
       LEFT JOIN packages p ON p.id = se.package_id
       WHERE se.starts_at >= $1::timestamptz
         AND se.starts_at < ($2::date + INTERVAL '1 day')
         AND ($3::uuid IS NULL OR se.resort_id = $3)
       ORDER BY se.starts_at ASC`,
      [from, to, resortId]
    );
    return Response.json({ events: rows.map(mapEvent) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const body = await parseJsonBody(request);
    const resortId = await requireResort(body.resortId);

    if (body.action === 'sync_official_calendar') {
      const year = Number(body.year) || new Date().getFullYear();
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new ApiError(400, 'Tahun kalender tidak valid');
      }
      const insertedCount = await transaction(async (client) => {
        let inserted = 0;
        for (const preset of getOfficialPresets(year)) {
          const event = normalizeSkyEventInput(preset);
          const existing = await client.query(
            'SELECT id FROM sky_events WHERE resort_id = $1 AND title = $2 AND starts_at = $3::timestamptz LIMIT 1',
            [resortId, event.title, event.startsAt]
          );
          if (existing.rows[0]) continue;
          await client.query(
            `INSERT INTO sky_events
              (title, event_type, starts_at, ends_at, description, source_name, source_url, visibility,
               resort_id, status, is_published, created_by, updated_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',true,$10,$10)`,
            [event.title, event.eventType, event.startsAt, event.endsAt, event.description,
              event.sourceName, event.sourceUrl, event.visibility, resortId, user.id]
          );
          inserted += 1;
        }
        await writeAudit(client, {
          actorId: user.id,
          action: 'sky_event.sync_official',
          entityType: 'sky_events',
          entityId: null,
          afterData: { resortId, year, insertedCount: inserted },
          request,
        });
        return inserted;
      });
      return Response.json({ success: true, insertedCount });
    }

    const parsed = createSkyEventSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Data sky event tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const event = normalizeSkyEventInput(parsed.data);
    if (event.packageId) {
      const pkg = await query(
        'SELECT id FROM packages WHERE id = $1 AND resort_id = $2 AND is_active = true',
        [event.packageId, resortId]
      );
      if (!pkg.rows[0]) throw new ApiError(400, 'Package tidak tersedia untuk resort ini');
    }

    const created = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO sky_events
          (title, event_type, starts_at, ends_at, description, source_name, source_url, visibility,
           resort_id, package_id, observation_spot, capacity, price_override_usd, image_url, status,
           is_published, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
         RETURNING *`,
        [event.title, event.eventType, event.startsAt, event.endsAt, event.description, event.sourceName,
          event.sourceUrl, event.visibility, resortId, event.packageId, event.observationSpot,
          event.capacity, event.priceOverrideUsd, event.imageUrl, event.status, event.isPublished, user.id]
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
