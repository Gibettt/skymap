import { assertSameOrigin, jsonError, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';

const PACKAGE_TYPES = new Set(['regular', 'private', 'kids']);
const EXPERIENCE_TYPES = new Set(['communal', 'private', 'kids']);

export async function GET() {
  try {
    await requireUser(['admin']);
    const { rows } = await query('SELECT * FROM packages ORDER BY name');
    return Response.json({ packages: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const body = await request.json();
    const name = String(body.name || '').trim();
    const packageType = String(body.packageType || '').trim();
    const experienceType = String(body.experienceType || '').trim();
    const location = String(body.location || '').trim();
    const adultPriceUsd = Number(body.adultPriceUsd || 0);
    const childPriceUsd = body.childPriceUsd === null || body.childPriceUsd === '' ? null : Number(body.childPriceUsd);

    if (
      !name ||
      !PACKAGE_TYPES.has(packageType) ||
      !EXPERIENCE_TYPES.has(experienceType) ||
      !location ||
      !Number.isFinite(adultPriceUsd) ||
      adultPriceUsd < 0 ||
      (childPriceUsd !== null && (!Number.isFinite(childPriceUsd) || childPriceUsd < 0))
    ) {
      return Response.json({ error: 'Invalid package data' }, { status: 400 });
    }

    const row = await transaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO packages
          (name, package_type, experience_type, location, adult_price_usd, child_price_usd, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING *`,
        [name, packageType, experienceType, location, adultPriceUsd, childPriceUsd]
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
