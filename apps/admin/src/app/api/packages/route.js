import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { paginationFromRequest, paginationMeta } from '@ephemeris/db/helpers';
import { createPackageSchema } from '@ephemeris/db/validators/package';

async function ensurePackageMetadataColumns(client) {
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS description text');
  await client.query('ALTER TABLE packages ADD COLUMN IF NOT EXISTS child_age_range text');
}

export async function GET(request) {
  try {
    await requireUser(['admin']);
    const pagination = paginationFromRequest(request);
    const { rows } = await query('SELECT * FROM packages ORDER BY name LIMIT $1 OFFSET $2', [pagination.limit, pagination.offset]);
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
    const parsed = createPackageSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data package tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    const row = await transaction(async (client) => {
      await ensurePackageMetadataColumns(client);
      const { rows } = await client.query(
        `INSERT INTO packages
          (name, package_type, experience_type, location, description, adult_price_usd, child_price_usd, child_age_range, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          data.name,
          data.packageType,
          data.experienceType,
          data.location,
          data.description,
          data.adultPriceUsd,
          data.childPriceUsd,
          data.childAgeRange,
          data.isActive,
        ]
      );
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
