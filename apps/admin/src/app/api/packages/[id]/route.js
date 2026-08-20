import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit, ApiError } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { updatePackageSchema } from '@ephemeris/db/validators/package';

const PACKAGE_COLUMNS = `
  id, name, package_type, experience_type, location, description, schedule, resort_id,
  adult_price_usd, child_price_usd, child_age_range, is_chargeable, is_active,
  image_mime_type, image_file_name, image_data IS NOT NULL AS has_image,
  CASE WHEN image_data IS NULL THEN NULL ELSE '/api/packages/' || id || '/image' END AS image_url,
  created_at, updated_at
`;
const PACKAGE_SELECT = `${PACKAGE_COLUMNS},
  COALESCE((
    SELECT json_agg(pi.label ORDER BY pi.sort_order)
    FROM package_inclusions pi
    WHERE pi.package_id = packages.id AND pi.is_active = true
  ), '[]'::json) AS inclusions
`;

const MAX_PACKAGE_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_PACKAGE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PACKAGE_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function parseInclusionsField(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function replacePackageInclusions(client, packageId, inclusions) {
  await client.query('DELETE FROM package_inclusions WHERE package_id = $1', [packageId]);
  for (const [sortOrder, label] of inclusions.entries()) {
    await client.query(
      `INSERT INTO package_inclusions (package_id, label, sort_order)
       VALUES ($1, $2, $3)`,
      [packageId, label, sortOrder],
    );
  }
}

function getFileExtension(fileName) {
  const match = String(fileName || '').toLowerCase().match(/\.[^.]+$/);
  return match?.[0] || '';
}

async function validatePackageImage(file) {
  if (!file || typeof file !== 'object' || file.size === 0) return null;
  if (file.size > MAX_PACKAGE_IMAGE_SIZE) throw new ApiError(400, 'Gambar maksimal 2MB.');
  if (!ALLOWED_PACKAGE_IMAGE_TYPES.includes(file.type)) throw new ApiError(400, 'Format gambar harus JPG, PNG, atau WEBP.');
  if (!ALLOWED_PACKAGE_IMAGE_EXTENSIONS.includes(getFileExtension(file.name))) throw new ApiError(400, 'Ekstensi gambar harus .jpg, .jpeg, .png, atau .webp.');

  return {
    data: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: String(file.name || 'package-image').slice(0, 180),
  };
}

async function parseUpdatePackageRequest(request) {
  if (!String(request.headers.get('content-type') || '').includes('multipart/form-data')) {
    return { fields: await parseJsonBody(request), image: undefined };
  }

  const form = await request.formData();
  const rawIsActive = form.get('isActive');

  const fields = {};
  if (form.has('name')) fields.name = form.get('name');
  if (form.has('packageType')) fields.packageType = form.get('packageType');
  if (form.has('experienceType')) fields.experienceType = form.get('experienceType');
  if (form.has('location')) fields.location = form.get('location');
  if (form.has('description')) fields.description = form.get('description');
  if (form.has('schedule')) fields.schedule = form.get('schedule');
  if (form.has('adultPriceUsd')) fields.adultPriceUsd = form.get('adultPriceUsd');
  if (form.has('childPriceUsd')) fields.childPriceUsd = form.get('childPriceUsd');
  if (form.has('childAgeRange')) fields.childAgeRange = form.get('childAgeRange');
  if (form.has('inclusions')) fields.inclusions = parseInclusionsField(form.get('inclusions'));
  if (form.has('resortId')) fields.resortId = form.get('resortId') || null;
  if (form.has('isChargeable')) fields.isChargeable = form.get('isChargeable') === 'true';
  if (rawIsActive !== null) fields.isActive = rawIsActive === 'true';

  const imageFile = form.get('image');
  let image = undefined;
  if (imageFile !== null) {
    if (typeof imageFile === 'string' && imageFile === '') {
      image = null; // intentional clear
    } else {
      image = await validatePackageImage(imageFile);
    }
  }

  return { fields, image };
}

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const id = parseId.data;

    const requestData = await parseUpdatePackageRequest(request);
    const parsed = updatePackageSchema.safeParse(requestData.fields);
    if (!parsed.success) {
      return Response.json({ error: 'Data package tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

    const updated = await transaction(async (client) => {
      const before = await client.query(`SELECT ${PACKAGE_SELECT} FROM packages WHERE id = $1`, [id]);
      if (!before.rows[0]) return null;

      const patch = {
        name: body.name === undefined ? before.rows[0].name : String(body.name || '').trim(),
        package_type: body.packageType === undefined ? before.rows[0].package_type : String(body.packageType || '').trim(),
        experience_type: body.experienceType === undefined ? before.rows[0].experience_type : String(body.experienceType || '').trim(),
        location: body.location === undefined ? before.rows[0].location : String(body.location || '').trim(),
        description: body.description === undefined ? before.rows[0].description : String(body.description || '').trim() || null,
        schedule: body.schedule === undefined ? before.rows[0].schedule : String(body.schedule || '').trim(),
        resort_id: body.resortId === undefined ? before.rows[0].resort_id : body.resortId,
        adult_price_usd: body.adultPriceUsd === undefined ? Number(before.rows[0].adult_price_usd) : Number(body.adultPriceUsd || 0),
        child_price_usd: body.childPriceUsd === undefined ? before.rows[0].child_price_usd : body.childPriceUsd === null || body.childPriceUsd === '' ? null : Number(body.childPriceUsd),
        child_age_range: body.childAgeRange === undefined ? before.rows[0].child_age_range : String(body.childAgeRange || '').trim() || null,
        is_chargeable: body.isChargeable ?? before.rows[0].is_chargeable,
        is_active: body.isActive ?? before.rows[0].is_active,
      };

      let imageFields = '';
      let imageValues = [];
      if (requestData.image !== undefined) {
        if (requestData.image === null) {
          imageFields = `, image_data = NULL, image_mime_type = NULL, image_file_name = NULL`;
        } else {
          imageFields = `, image_data = $14, image_mime_type = $15, image_file_name = $16`;
          imageValues = [requestData.image.data, requestData.image.mimeType, requestData.image.fileName];
        }
      }

      await client.query(
        `UPDATE packages SET
          name = $2,
          package_type = $3,
          experience_type = $4,
          location = $5,
          description = $6,
          schedule = $7,
          resort_id = $8,
          adult_price_usd = $9,
          child_price_usd = $10,
          child_age_range = $11,
          is_chargeable = $12,
          is_active = $13
          ${imageFields}
         WHERE id = $1
         RETURNING id`,
        [id, patch.name, patch.package_type, patch.experience_type, patch.location, patch.description, patch.schedule, patch.resort_id, patch.adult_price_usd, patch.child_price_usd, patch.child_age_range, patch.is_chargeable, patch.is_active, ...imageValues]
      );
      if (body.inclusions !== undefined) {
        await replacePackageInclusions(client, id, body.inclusions);
      }
      const { rows } = await client.query(`SELECT ${PACKAGE_SELECT} FROM packages WHERE id = $1`, [id]);
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
