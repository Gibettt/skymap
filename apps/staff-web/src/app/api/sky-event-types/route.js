import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';

import { defaultEventTypes, mapCustomEventType } from '../sky-events/_lib/event-type';

function eventTypeName(value) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80) throw new ApiError(400, 'Event type name must contain 1 to 80 characters');
  return name;
}

function eventTypeSlug(name) {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (!slug) throw new ApiError(400, 'Event type name must contain letters or numbers');
  return slug;
}

export async function GET() {
  try {
    const user = await requirePermission('staff.sky_guide', ['internal']);
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const { rows } = await query(
      `SELECT id, name, slug FROM sky_event_types
       WHERE resort_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [user.resort_id],
    );
    return Response.json({ types: [...defaultEventTypes(), ...rows.map(mapCustomEventType)] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('staff.sky_guide', ['internal'], { write: true });
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const body = await parseJsonBody(request);
    const name = eventTypeName(body.name);
    const slug = eventTypeSlug(name);

    if (defaultEventTypes().some((type) => type.slug === slug || type.name.toLowerCase() === name.toLowerCase())) {
      throw new ApiError(409, 'This event type already exists');
    }

    const created = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO sky_event_types (resort_id, name, slug, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, slug`,
        [user.resort_id, name, slug, user.id],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event_type.create',
        entityType: 'sky_event_type',
        entityId: rows[0].id,
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    return Response.json({ type: mapCustomEventType(created) }, { status: 201 });
  } catch (error) {
    if (error?.code === '23505') return Response.json({ error: 'This event type already exists' }, { status: 409 });
    return jsonError(error);
  }
}
