import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { updateSkyEventSchema } from '@ephemeris/db/validators/sky-event';
import { normalizeSkyEventInput } from '@ephemeris/sky';

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('staff.sky_guide', ['internal'], { write: true });
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const id = parseId.data;
    const parsed = updateSkyEventSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data sky event tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const updated = await transaction(async (client) => {
      const before = await client.query('SELECT * FROM sky_events WHERE id = $1 AND resort_id = $2', [id, user.resort_id]);
      if (!before.rows[0]) return null;
      const input = normalizeSkyEventInput({
        title: body.title ?? before.rows[0].title,
        eventType: body.eventType ?? before.rows[0].event_type,
        startsAt: body.startsAt ?? before.rows[0].starts_at,
        endsAt: body.endsAt ?? before.rows[0].ends_at,
        description: body.description ?? before.rows[0].description,
        sourceName: body.sourceName ?? before.rows[0].source_name,
        sourceUrl: body.sourceUrl ?? before.rows[0].source_url,
        imageUrl: body.imageUrl ?? before.rows[0].image_url,
        packageId: body.packageId ?? before.rows[0].package_id,
        observationSpot: body.observationSpot ?? before.rows[0].observation_spot,
        capacity: body.capacity ?? before.rows[0].capacity,
        priceOverrideUsd: body.priceOverrideUsd ?? before.rows[0].price_override_usd,
        status: body.status ?? (body.isPublished === undefined
          ? before.rows[0].status
          : body.isPublished ? 'published' : 'draft'),
        visibility: body.visibility ?? before.rows[0].visibility,
        isPublished: body.isPublished ?? before.rows[0].is_published,
      });
      if (input.packageId) {
        const pkg = await client.query('SELECT id FROM packages WHERE id = $1 AND resort_id = $2 AND is_active = true', [input.packageId, user.resort_id]);
        if (!pkg.rows[0]) throw new ApiError(400, 'Package is not available for this resort');
      }
      const { rows } = await client.query(
        `UPDATE sky_events SET title = $2, event_type = $3, starts_at = $4, ends_at = $5,
          description = $6, source_name = $7, source_url = $8, visibility = $9,
          package_id = $10, observation_spot = $11, capacity = $12, price_override_usd = $13,
          image_url = $14, status = $15, is_published = $16, updated_by = $17
         WHERE id = $1 AND resort_id = $18 RETURNING *`,
        [id, input.title, input.eventType, input.startsAt, input.endsAt, input.description,
          input.sourceName, input.sourceUrl, input.visibility, input.packageId, input.observationSpot,
          input.capacity, input.priceOverrideUsd, input.imageUrl, input.status, input.isPublished, user.id, user.resort_id]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.update',
        entityType: 'sky_event',
        entityId: id,
        beforeData: before.rows[0],
        afterData: rows[0],
        request,
      });
      return rows[0];
    });
    if (!updated) return Response.json({ error: 'Sky event not found' }, { status: 404 });
    return Response.json({ event: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('staff.sky_guide', ['internal'], { write: true });
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const id = parseId.data;
    const removed = await transaction(async (client) => {
      const before = await client.query('DELETE FROM sky_events WHERE id = $1 AND resort_id = $2 RETURNING *', [id, user.resort_id]);
      if (!before.rows[0]) return null;
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.delete',
        entityType: 'sky_event',
        entityId: id,
        beforeData: before.rows[0],
        request,
      });
      return before.rows[0];
    });
    if (!removed) return Response.json({ error: 'Sky event not found' }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
