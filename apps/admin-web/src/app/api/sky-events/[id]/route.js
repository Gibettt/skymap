import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { updateSkyEventSchema } from '@ephemeris/db/validators/sky-event';
import { emit, EventTypes } from '@ephemeris/events';
import { normalizeSkyEventInput } from '@ephemeris/sky';

import { mapSkyEvent, selectSkyEvent, validateRelations } from '../_lib/sky-event';
import { assertAvailableEventType } from '../_lib/event-type';

function mergeInput(before, body) {
  return normalizeSkyEventInput({
    title: body.title ?? before.title,
    eventType: body.eventType ?? before.event_type,
    startsAt: body.startsAt ?? before.starts_at,
    endsAt: body.endsAt === undefined ? before.ends_at : body.endsAt,
    description: body.description === undefined ? before.description : body.description,
    sourceName: body.sourceName === undefined ? before.source_name : body.sourceName,
    sourceUrl: body.sourceUrl === undefined ? before.source_url : body.sourceUrl,
    imageUrl: body.imageUrl === undefined ? before.image_url : body.imageUrl,
    packageId: body.packageId === undefined ? before.package_id : body.packageId,
    observationSpot: body.observationSpot === undefined ? before.observation_spot : body.observationSpot,
    capacity: body.capacity === undefined ? before.capacity : body.capacity,
    priceOverrideUsd: body.priceOverrideUsd === undefined ? before.price_override_usd : body.priceOverrideUsd,
    status: body.status ?? before.status,
    visibility: body.visibility ?? before.visibility,
    isPublished: body.isPublished ?? before.is_published,
  });
}

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('admin.calendar', ['admin'], { write: true });
    const { id: rawId } = await params;
    const id = uuidSchema.safeParse(rawId);
    if (!id.success) return Response.json({ error: 'Invalid sky event ID' }, { status: 400 });

    const rawBody = await parseJsonBody(request);
    const parsed = updateSkyEventSchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid sky event data', details: parsed.error.flatten() }, { status: 400 });
    }
    let requestedResortId;
    if (rawBody?.resortId !== undefined) {
      const resortId = uuidSchema.safeParse(rawBody.resortId);
      if (!resortId.success) return Response.json({ error: 'Invalid resort ID' }, { status: 400 });
      requestedResortId = resortId.data;
    }

    const updated = await transaction(async (client) => {
      const current = await client.query('SELECT * FROM sky_events WHERE id = $1 FOR UPDATE', [id.data]);
      const before = current.rows[0];
      if (!before) return null;
      const resortId = requestedResortId ?? before.resort_id;
      const input = mergeInput(before, parsed.data);
      const packageChanged = input.packageId !== before.package_id || resortId !== before.resort_id;
      await validateRelations(client, {
        resortId,
        packageId: input.packageId,
        requireActivePackage: packageChanged,
      });
      await assertAvailableEventType(client, resortId, input.eventType);

      const { rows } = await client.query(
        `UPDATE sky_events SET title = $2, event_type = $3, starts_at = $4, ends_at = $5,
          description = $6, source_name = $7, source_url = $8, visibility = $9,
          resort_id = $10, package_id = $11, observation_spot = $12, capacity = $13,
          price_override_usd = $14, image_url = $15, status = $16, is_published = $17,
          updated_by = $18
         WHERE id = $1 RETURNING *`,
        [id.data, input.title, input.eventType, input.startsAt, input.endsAt, input.description,
          input.sourceName, input.sourceUrl, input.visibility, resortId, input.packageId,
          input.observationSpot, input.capacity, input.priceOverrideUsd, input.imageUrl,
          input.status, input.isPublished, user.id],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.update',
        entityType: 'sky_event',
        entityId: id.data,
        beforeData: before,
        afterData: rows[0],
        request,
      });
      await emit(EventTypes.SKY_EVENT_UPDATED, {
        skyEventId: id.data,
        title: rows[0].title,
        resortId: rows[0].resort_id,
        previousStatus: before.status,
        status: rows[0].status,
      }, { client, actorId: user.id });
      return selectSkyEvent(client, id.data);
    });

    if (!updated) return Response.json({ error: 'Sky event not found' }, { status: 404 });
    return Response.json({ event: mapSkyEvent(updated) });
  } catch (error) {
    if (error instanceof TypeError) return jsonError(new ApiError(400, error.message));
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('admin.calendar', ['admin'], { write: true });
    const { id: rawId } = await params;
    const id = uuidSchema.safeParse(rawId);
    if (!id.success) return Response.json({ error: 'Invalid sky event ID' }, { status: 400 });

    const removed = await transaction(async (client) => {
      const current = await client.query('SELECT * FROM sky_events WHERE id = $1 FOR UPDATE', [id.data]);
      const before = current.rows[0];
      if (!before) return null;
      await client.query('DELETE FROM sky_events WHERE id = $1', [id.data]);
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.delete',
        entityType: 'sky_event',
        entityId: id.data,
        beforeData: before,
        request,
      });
      await emit(EventTypes.SKY_EVENT_DELETED, {
        skyEventId: id.data,
        title: before.title,
        resortId: before.resort_id,
      }, { client, actorId: user.id });
      return { id: before.id, title: before.title };
    });

    if (!removed) return Response.json({ error: 'Sky event not found' }, { status: 404 });
    return Response.json({ event: removed });
  } catch (error) {
    return jsonError(error);
  }
}
