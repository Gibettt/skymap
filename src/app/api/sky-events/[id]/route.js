import { assertSameOrigin, jsonError, requireUser, writeAudit } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { normalizeSkyEventInput } from '@/lib/sky-events.mjs';

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id } = await params;
    const body = await request.json();
    const updated = await transaction(async (client) => {
      const before = await client.query('SELECT * FROM sky_events WHERE id = $1', [id]);
      if (!before.rows[0]) return null;
      const input = normalizeSkyEventInput({
        title: body.title ?? before.rows[0].title,
        eventType: body.eventType ?? before.rows[0].event_type,
        startsAt: body.startsAt ?? before.rows[0].starts_at,
        endsAt: body.endsAt ?? before.rows[0].ends_at,
        description: body.description ?? before.rows[0].description,
        sourceName: body.sourceName ?? before.rows[0].source_name,
        sourceUrl: body.sourceUrl ?? before.rows[0].source_url,
        visibility: body.visibility ?? before.rows[0].visibility,
        isPublished: body.isPublished ?? before.rows[0].is_published,
      });
      const { rows } = await client.query(
        `UPDATE sky_events SET title = $2, event_type = $3, starts_at = $4, ends_at = $5,
          description = $6, source_name = $7, source_url = $8, visibility = $9,
          is_published = $10, updated_by = $11
         WHERE id = $1 RETURNING *`,
        [id, input.title, input.eventType, input.startsAt, input.endsAt, input.description, input.sourceName, input.sourceUrl, input.visibility, input.isPublished, user.id]
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
    const user = await requireUser(['admin']);
    const { id } = await params;
    const removed = await transaction(async (client) => {
      const before = await client.query('DELETE FROM sky_events WHERE id = $1 RETURNING *', [id]);
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
