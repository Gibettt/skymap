import { ApiError } from '@ephemeris/auth';
import { DEFAULT_SKY_EVENT_TYPES } from '@ephemeris/sky';

const DEFAULT_SLUGS = new Set(DEFAULT_SKY_EVENT_TYPES.map((type) => type.slug));

export function mapCustomEventType(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    isSystem: false,
  };
}

export function defaultEventTypes() {
  return DEFAULT_SKY_EVENT_TYPES.map((type) => ({
    id: `system:${type.slug}`,
    ...type,
  }));
}

export async function assertAvailableEventType(client, resortId, slug) {
  if (DEFAULT_SLUGS.has(slug)) return;
  const { rows } = await client.query(
    `SELECT id FROM sky_event_types
     WHERE resort_id = $1 AND slug = $2 AND is_active = true
     LIMIT 1`,
    [resortId, slug],
  );
  if (!rows[0]) throw new ApiError(400, 'Event type is not available for this resort');
}
