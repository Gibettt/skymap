import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { createSkyEventSchema } from '@ephemeris/db/validators/sky-event';
import { emit, EventTypes } from '@ephemeris/events';
import { normalizeSkyEventInput } from '@ephemeris/sky';

import { mapSkyEvent, selectSkyEvent, validateRelations } from './_lib/sky-event';

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

    const created = await transaction(async (client) => {
      await validateRelations(client, {
        resortId: resortId.data,
        packageId: input.packageId,
      });
      const { rows } = await client.query(
        `INSERT INTO sky_events
          (title, event_type, starts_at, ends_at, description, source_name, source_url, visibility,
           resort_id, package_id, observation_spot, capacity, price_override_usd, image_url, status,
           is_published, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
         RETURNING *`,
        [input.title, input.eventType, input.startsAt, input.endsAt, input.description,
          input.sourceName, input.sourceUrl, input.visibility, resortId.data, input.packageId,
          input.observationSpot, input.capacity, input.priceOverrideUsd, input.imageUrl,
          input.status, input.isPublished, user.id],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.create',
        entityType: 'sky_event',
        entityId: rows[0].id,
        afterData: rows[0],
        request,
      });
      await emit(EventTypes.SKY_EVENT_CREATED, {
        skyEventId: rows[0].id,
        title: rows[0].title,
        resortId: rows[0].resort_id,
        status: rows[0].status,
      }, { client, actorId: user.id });
      return selectSkyEvent(client, rows[0].id);
    });

    return Response.json({ event: mapSkyEvent(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof TypeError) return jsonError(new ApiError(400, error.message));
    return jsonError(error);
  }
}
