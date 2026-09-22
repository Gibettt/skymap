import { ApiError } from '@ephemeris/auth';

export const SKY_EVENT_SELECT = `
  SELECT se.*, r.name AS resort_name, p.name AS package_name
  FROM sky_events se
  JOIN resorts r ON r.id = se.resort_id
  LEFT JOIN packages p ON p.id = se.package_id
`;

export function mapSkyEvent(row) {
  return {
    id: row.id,
    title: row.title,
    eventType: row.event_type,
    startsAt: new Date(row.starts_at).toISOString(),
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    description: row.description || '',
    sourceName: row.source_name || '',
    sourceUrl: row.source_url,
    visibility: row.visibility,
    resortId: row.resort_id,
    resortName: row.resort_name,
    packageId: row.package_id,
    packageName: row.package_name,
    observationSpot: row.observation_spot || '',
    capacity: row.capacity == null ? null : Number(row.capacity),
    priceOverrideUsd: row.price_override_usd == null ? null : Number(row.price_override_usd),
    imageUrl: row.image_data ? `/api/sky-events/${row.id}/image` : row.image_url,
    status: row.status,
    isPublished: row.is_published,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export async function validateRelations(client, { resortId, packageId, requireActivePackage = true }) {
  const resort = await client.query('SELECT id FROM resorts WHERE id = $1', [resortId]);
  if (!resort.rows[0]) throw new ApiError(400, 'Resort not found');
  if (!packageId) return;

  const pkg = await client.query(
    `SELECT id, is_active FROM packages WHERE id = $1 AND resort_id = $2`,
    [packageId, resortId],
  );
  if (!pkg.rows[0]) throw new ApiError(400, 'Package is not available at the selected resort');
  if (requireActivePackage && !pkg.rows[0].is_active) {
    throw new ApiError(400, 'Inactive packages cannot be assigned to a sky event');
  }
}

export async function selectSkyEvent(client, id) {
  const { rows } = await client.query(`${SKY_EVENT_SELECT} WHERE se.id = $1`, [id]);
  return rows[0] || null;
}
