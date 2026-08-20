import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { paginationFromRequest, paginationMeta } from '@ephemeris/db/helpers';
import { createPackageSchema } from '@ephemeris/db/validators/package';

const MAX_PACKAGE_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_PACKAGE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_PACKAGE_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
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

function parseInclusionsField(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function insertPackageInclusions(client, packageId, inclusions) {
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

async function parseCreatePackageRequest(request) {
  if (!String(request.headers.get('content-type') || '').includes('multipart/form-data')) {
    return { fields: await parseJsonBody(request), image: null };
  }

  const form = await request.formData();
  const rawIsActive = form.get('isActive');
  const rawIsChargeable = form.get('isChargeable');
  return {
    fields: {
      name: form.get('name'),
      packageType: form.get('packageType'),
      experienceType: form.get('experienceType'),
      location: form.get('location'),
      description: form.get('description'),
      schedule: form.get('schedule'),
      adultPriceUsd: form.get('adultPriceUsd'),
      childPriceUsd: form.get('childPriceUsd'),
      childAgeRange: form.get('childAgeRange'),
      inclusions: parseInclusionsField(form.get('inclusions')),
      resortId: form.get('resortId') || null,
      isChargeable: rawIsChargeable === null ? true : rawIsChargeable === 'true',
      isActive: rawIsActive === null ? true : rawIsActive === 'true',
    },
    image: await validatePackageImage(form.get('image')),
  };
}

export async function GET(request) {
  try {
    await requireUser(['admin']);
    const pagination = paginationFromRequest(request);
    const { rows } = await query(`SELECT ${PACKAGE_SELECT} FROM packages ORDER BY name LIMIT $1 OFFSET $2`, [pagination.limit, pagination.offset]);
    const { rows: countRows } = await query('SELECT COUNT(*) FROM packages');
    return Response.json({
      packages: rows,
      pagination: paginationMeta({ ...pagination, total: Number(countRows[0].count) }),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const requestData = await parseCreatePackageRequest(request);
    const parsed = createPackageSchema.safeParse(requestData.fields);
    if (!parsed.success) {
      return Response.json({ error: 'Data package tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const row = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO packages
          (name, package_type, experience_type, location, description, schedule, resort_id,
           image_data, image_mime_type, image_file_name, adult_price_usd, child_price_usd,
           child_age_range, is_chargeable, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING ${PACKAGE_COLUMNS}`,
        [
          data.name,
          data.packageType,
          data.experienceType,
          data.location,
          data.description,
          data.schedule,
          data.resortId,
          requestData.image?.data || null,
          requestData.image?.mimeType || null,
          requestData.image?.fileName || null,
          data.adultPriceUsd,
          data.childPriceUsd,
          data.childAgeRange,
          data.isChargeable,
          data.isActive,
        ]
      );
      await insertPackageInclusions(client, rows[0].id, data.inclusions);
      rows[0].inclusions = data.inclusions;
      await writeAudit(client, {
        actorId: user.id,
        action: 'package.create',
        entityType: 'package',
        entityId: rows[0].id,
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    return Response.json({ package: row }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
