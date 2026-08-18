import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { updatePackageSchema } from '@ephemeris/db/validators/package';

const PACKAGE_SELECT = `
  id, name, package_type, experience_type, location, description,
  adult_price_usd, child_price_usd, child_age_range, is_active,
  image_mime_type, image_file_name, image_data IS NOT NULL AS has_image,
  CASE WHEN image_data IS NULL THEN NULL ELSE '/api/packages/' || id || '/image' END AS image_url,
  created_at, updated_at
`;

async function ensurePackageMetadataColumns(client) {
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS description text');
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS child_age_range text');
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_data bytea');
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_mime_type text');
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_file_name text');
}

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const id = parseId.data;
    const parsed = updatePackageSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data package tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const updated = await transaction(async (client) => {
      await ensurePackageMetadataColumns(client);
      const before = await client.query(`SELECT ${PACKAGE_SELECT} FROM packages WHERE id = $1`, [id]);
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
         RETURNING ${PACKAGE_SELECT}`,
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
