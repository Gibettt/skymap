import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { updateSkyEventSchema } from '@ephemeris/db/validators/sky-event';
import { normalizeSkyEventInput } from '@ephemeris/sky';

function validId(value, label) {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new ApiError(400, `${label} tidak valid`);
  return parsed.data;
}

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const id = validId((await params).id, 'ID event');
    const body = await parseJsonBody(request);
    const resortId = validId(body.resortId, 'Resort');
    const parsed = updateSkyEventSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Data sky event tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await transaction(async (client) => {
      const beforeResult = await client.query(
        'SELECT * FROM sky_events WHERE id = $1 AND resort_id = $2',
        [id, resortId]
      );
      const before = beforeResult.rows[0];
      if (!before) return null;
      const event = normalizeSkyEventInput({
        title: parsed.data.title ?? before.title,
        eventType: parsed.data.eventType ?? before.event_type,
        startsAt: parsed.data.startsAt ?? before.starts_at,
        endsAt: parsed.data.endsAt ?? before.ends_at,
        description: parsed.data.description ?? before.description,
        sourceName: parsed.data.sourceName ?? before.source_name,
        sourceUrl: parsed.data.sourceUrl ?? before.source_url,
        imageUrl: parsed.data.imageUrl ?? before.image_url,
        packageId: parsed.data.packageId ?? before.package_id,
        observationSpot: parsed.data.observationSpot ?? before.observation_spot,
        capacity: parsed.data.capacity ?? before.capacity,
        priceOverrideUsd: parsed.data.priceOverrideUsd ?? before.price_override_usd,
        status: parsed.data.status ?? before.status,
        visibility: parsed.data.visibility ?? before.visibility,
      });
      if (event.packageId) {
        const pkg = await client.query(
          'SELECT id FROM packages WHERE id = $1 AND resort_id = $2 AND is_active = true',
          [event.packageId, resortId]
        );
        if (!pkg.rows[0]) throw new ApiError(400, 'Package tidak tersedia untuk resort ini');
      }
      const { rows } = await client.query(
        `UPDATE sky_events SET title=$3, event_type=$4, starts_at=$5, ends_at=$6,
          description=$7, source_name=$8, source_url=$9, visibility=$10, package_id=$11,
          observation_spot=$12, capacity=$13, price_override_usd=$14, image_url=$15,
          status=$16, is_published=$17, updated_by=$18
         WHERE id = $1 AND resort_id = $2 RETURNING *`,
        [id, resortId, event.title, event.eventType, event.startsAt, event.endsAt, event.description,
          event.sourceName, event.sourceUrl, event.visibility, event.packageId, event.observationSpot,
          event.capacity, event.priceOverrideUsd, event.imageUrl, event.status, event.isPublished, user.id]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.update',
        entityType: 'sky_event',
        entityId: id,
        beforeData: before,
        afterData: rows[0],
        request,
      });
      return rows[0];
    });
    if (!updated) return Response.json({ error: 'Sky event tidak ditemukan' }, { status: 404 });
    return Response.json({ event: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const id = validId((await params).id, 'ID event');
    const resortId = validId(new URL(request.url).searchParams.get('resortId'), 'Resort');
    const removed = await transaction(async (client) => {
      const { rows } = await client.query(
        'DELETE FROM sky_events WHERE id = $1 AND resort_id = $2 RETURNING *',
        [id, resortId]
      );
      if (!rows[0]) return null;
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.delete',
        entityType: 'sky_event',
        entityId: id,
        beforeData: rows[0],
        request,
      });
      return rows[0];
    });
    if (!removed) return Response.json({ error: 'Sky event tidak ditemukan' }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
