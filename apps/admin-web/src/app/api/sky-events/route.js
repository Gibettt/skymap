import { randomUUID } from 'node:crypto';

import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { ensureEventNotificationSchema, ensureSkyEventSeriesSchema, transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { createSkyEventSchema } from '@ephemeris/db/validators/sky-event';
import { emit, EventTypes } from '@ephemeris/events';
import { normalizeSkyEventInput } from '@ephemeris/sky';

import { eventOccurrences, mapSkyEvent, selectSkyEvent, validateRelations } from './_lib/sky-event';
import { assertAvailableEventType } from './_lib/event-type';

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('admin.calendar', ['admin'], { write: true });
    const body = await parseJsonBody(request);
    const resortId = uuidSchema.safeParse(body?.resortId);
    if (!resortId.success) return Response.json({ error: 'A valid resort is required' }, { status: 400 });

    const parsed = createSkyEventSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid sky event data', details: parsed.error.flatten() }, { status: 400 });
    }
    const input = normalizeSkyEventInput(parsed.data);
    await ensureSkyEventSeriesSchema();
    await ensureEventNotificationSchema();

    const created = await transaction(async (client) => {
      await validateRelations(client, {
        resortId: resortId.data,
        packageId: input.packageId,
      });
      await assertAvailableEventType(client, resortId.data, input.eventType);
      const occurrences = await eventOccurrences(client, resortId.data, input, parsed.data.repeatWeeklyUntil);
      const seriesId = occurrences.length > 1 ? randomUUID() : null;

      const ids = [];
      for (const occurrence of occurrences) {
        const { rows } = await client.query(
          `INSERT INTO sky_events
            (title, event_type, starts_at, ends_at, description, source_name, source_url, visibility,
             resort_id, package_id, observation_spot, capacity, price_override_usd, image_url, status,
             is_published, created_by, updated_by, series_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17, $18)
           RETURNING id`,
          [input.title, input.eventType, occurrence.startsAt, occurrence.endsAt, input.description,
            input.sourceName, input.sourceUrl, input.visibility, resortId.data, input.packageId,
            input.observationSpot, input.capacity, input.priceOverrideUsd, input.imageUrl,
            input.status, input.isPublished, user.id, seriesId],
        );
        ids.push(rows[0].id);
      }
      const first = await selectSkyEvent(client, ids[0]);
      await writeAudit(client, {
        actorId: user.id,
        action: occurrences.length > 1 ? 'sky_event.create_weekly' : 'sky_event.create',
        entityType: 'sky_event',
        entityId: ids[0],
        afterData: { ...first, occurrences: occurrences.length, seriesId },
        request,
      });
      await emit(EventTypes.SKY_EVENT_CREATED, {
        skyEventId: ids[0],
        title: first.title,
        resortId: first.resort_id,
        status: first.status,
        occurrences: occurrences.length,
      }, { client, actorId: user.id });
      return { event: first, createdCount: ids.length };
    });

    return Response.json({ event: mapSkyEvent(created.event), createdCount: created.createdCount }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) return jsonError(new ApiError(400, error.message));
    return jsonError(error);
  }
}
