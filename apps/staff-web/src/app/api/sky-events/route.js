import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { query, transaction } from "@ephemeris/db";
import { createSkyEventSchema } from "@ephemeris/db/validators/sky-event";
import { getOfficialPresets, normalizeSkyEventInput } from "@ephemeris/sky";

function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    description: row.description || "",
    sourceName: row.source_name || "",
    sourceUrl: row.source_url || null,
    visibility: row.visibility,
    resortId: row.resort_id,
    packageId: row.package_id,
    packageName: row.package_name || null,
    observationSpot: row.observation_spot || "",
    capacity: row.capacity,
    priceOverrideUsd: row.price_override_usd == null ? null : Number(row.price_override_usd),
    imageUrl: row.image_url || null,
    status: row.status,
    isPublished: row.is_published,
    calculated: false,
  };
}

function dates(request) {
  const url = new URL(request.url);
  const today = new Date();
  const fallbackFrom = today.toISOString().slice(0, 10);
  const fallbackTo = new Date(today.getTime() + 365 * 86400000).toISOString().slice(0, 10);
  const from = url.searchParams.get("from") || fallbackFrom;
  const to = url.searchParams.get("to") || fallbackTo;
  if (
    Number.isNaN(new Date(`${from}T00:00:00Z`).getTime()) ||
    Number.isNaN(new Date(`${to}T00:00:00Z`).getTime()) ||
    from > to
  ) {
    throw new ApiError(400, "Invalid date range");
  }
  return { from, to };
}

export async function GET(request) {
  try {
    const user = await requirePermission("staff.sky_guide", ["internal"]);
    if (!user.resort_id) throw new ApiError(403, "Staff resort profile is not configured");
    const { from, to } = dates(request);
    const { rows } = await query(
      `SELECT se.*, p.name AS package_name FROM sky_events se
       LEFT JOIN packages p ON p.id = se.package_id
         WHERE se.resort_id = $1
           AND se.starts_at >= $2::timestamptz
           AND se.starts_at < ($3::date + INTERVAL '1 day')
         ORDER BY se.starts_at ASC`,
      [user.resort_id, from, to],
    );
    return Response.json({ events: rows.map(mapEvent) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("staff.sky_guide", ["internal"], { write: true });
    if (!user.resort_id) throw new ApiError(403, "Staff resort profile is not configured");
    const body = await parseJsonBody(request);

    // 1-Click Official Sync from NASA / IAU / IMO / ESA Presets
    if (body.action === "sync_official_calendar") {
      const year = Number(body.year) || new Date().getFullYear();
      const presets = getOfficialPresets(year);
      let insertedCount = 0;

      await transaction(async (client) => {
        for (const preset of presets) {
          const normalized = normalizeSkyEventInput(preset);
          // Check if already exists by title
          const existing = await client.query(
            "SELECT id FROM sky_events WHERE resort_id = $1 AND title = $2 AND starts_at = $3::timestamptz LIMIT 1",
            [user.resort_id, normalized.title, normalized.startsAt],
          );
          if (existing.rows.length === 0) {
            await client.query(
              `INSERT INTO sky_events
                (title, event_type, starts_at, ends_at, description, source_name, source_url, visibility,
                 resort_id, status, is_published, created_by, updated_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published', true, $10, $10)`,
              [
                normalized.title,
                normalized.eventType,
                normalized.startsAt,
                normalized.endsAt,
                normalized.description,
                normalized.sourceName,
                normalized.sourceUrl,
                normalized.visibility,
                user.resort_id,
                user.id,
              ],
            );
            insertedCount++;
          }
        }

        await writeAudit(client, {
          actorId: user.id,
          action: "sky_event.sync_official",
          entityType: "sky_events",
          entityId: null,
          afterData: { year, insertedCount },
          request,
        });
      });

      return Response.json({
        success: true,
        message: `Berhasil menyinkronkan ${insertedCount} event astronomi resmi NASA, IAU, & IMO untuk tahun ${year}.`,
        insertedCount,
      });
    }

    const parsed = createSkyEventSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Data sky event tidak valid", details: parsed.error.flatten() }, { status: 400 });
    }
    const event = normalizeSkyEventInput(parsed.data);
    if (event.packageId) {
      const pkg = await query("SELECT id FROM packages WHERE id = $1 AND resort_id = $2 AND is_active = true", [
        event.packageId,
        user.resort_id,
      ]);
      if (!pkg.rows[0]) throw new ApiError(400, "Package is not available for this resort");
    }
    const created = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO sky_events
          (title, event_type, starts_at, ends_at, description, source_name, source_url, visibility,
           resort_id, package_id, observation_spot, capacity, price_override_usd, image_url, status,
           is_published, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
         RETURNING *`,
        [
          event.title,
          event.eventType,
          event.startsAt,
          event.endsAt,
          event.description,
          event.sourceName,
          event.sourceUrl,
          event.visibility,
          user.resort_id,
          event.packageId,
          event.observationSpot,
          event.capacity,
          event.priceOverrideUsd,
          event.imageUrl,
          event.status,
          event.isPublished,
          user.id,
        ],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: "sky_event.create",
        entityType: "sky_event",
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
