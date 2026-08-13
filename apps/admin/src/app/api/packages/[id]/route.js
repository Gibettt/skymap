import { ApiError, assertSameOrigin, jsonError, requireUser, writeAudit } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';

const PACKAGE_TYPES = new Set(['regular', 'private', 'kids']);
const EXPERIENCE_TYPES = new Set(['communal', 'private', 'kids']);

async function ensurePackageMetadataColumns(client) {
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS description text');
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS child_age_range text');
}

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id } = await params;
    const body = await request.json();

    const updated = await transaction(async (client) => {
      await ensurePackageMetadataColumns(client);
      const before = await client.query('SELECT * FROM packages WHERE id = $1', [id]);
      if (!before.rows[0]) return null;

      const patch = {
        name: body.name === undefined ? before.rows[0].name : String(body.name || '').trim(),
        package_type: body.packageType === undefined ? before.rows[0].package_type : String(body.packageType || '').trim(),
        experience_type: body.experienceType === undefined ? before.rows[0].experience_type : String(body.experienceType || '').trim(),
        location: body.location === undefined ? before.rows[0].location : String(body.location || '').trim(),
        description: body.description === undefined ? before.rows[0].description : String(body.description || '').trim() || null,
        adult_price_usd: body.adultPriceUsd === undefined ? Number(before.rows[0].adult_price_usd) : Number(body.adultPriceUsd || 0),
        child_price_usd: body.childPriceUsd === undefined ? before.rows[0].child_price_usd : body.childPriceUsd === null || body.childPriceUsd === '' ? null : Number(body.childPriceUsd),
        child_age_range: body.childAgeRange === undefined ? before.rows[0].child_age_range : String(body.childAgeRange || '').trim() || null,
        is_active: body.isActive ?? before.rows[0].is_active,
      };

      if (
        !patch.name ||
        !PACKAGE_TYPES.has(patch.package_type) ||
        !EXPERIENCE_TYPES.has(patch.experience_type) ||
        !patch.location ||
        (patch.description !== null && patch.description.length > 240) ||
        (patch.child_age_range !== null && patch.child_age_range.length > 80) ||
        !Number.isFinite(patch.adult_price_usd) ||
        patch.adult_price_usd < 0 ||
        (patch.child_price_usd !== null && (!Number.isFinite(Number(patch.child_price_usd)) || Number(patch.child_price_usd) < 0))
      ) {
        throw new ApiError(400, 'Invalid package data');
      }

      const { rows } = await client.query(
        `UPDATE packages SET
          name = $2,
          package_type = $3,
          experience_type = $4,
          location = $5,
          description = $6,
          adult_price_usd = $7,
          child_price_usd = $8,
          child_age_range = $9,
          is_active = $10
         WHERE id = $1
         RETURNING *`,
        [id, patch.name, patch.package_type, patch.experience_type, patch.location, patch.description, patch.adult_price_usd, patch.child_price_usd, patch.child_age_range, patch.is_active]
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'package.update',
        entityType: 'package',
        entityId: id,
        beforeData: before.rows[0],
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    if (!updated) return Response.json({ error: 'Package not found' }, { status: 404 });
    return Response.json({ package: updated });
  } catch (error) {
    return jsonError(error);
  }
}
