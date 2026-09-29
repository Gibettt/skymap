import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { copyPackageSchema } from '@ephemeris/db/validators/package';

export async function POST(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, 'ID package tidak valid.');

    const parsed = copyPackageSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw new ApiError(400, 'Resort tujuan tidak valid.');

    const copied = await transaction(async (client) => {
      const sourceResult = await client.query('SELECT * FROM packages WHERE id = $1 FOR SHARE', [parsedId.data]);
      const source = sourceResult.rows[0];
      if (!source) throw new ApiError(404, 'Package sumber tidak ditemukan.');
      if (source.resort_id === parsed.data.resortId) throw new ApiError(400, 'Pilih resort tujuan yang berbeda.');

      const target = await client.query('SELECT id FROM resorts WHERE id = $1 FOR SHARE', [parsed.data.resortId]);
      if (!target.rows[0]) throw new ApiError(404, 'Resort tujuan tidak ditemukan.');

      const { rows } = await client.query(`
        INSERT INTO packages (
          name, package_type, experience_type, location, description, schedule, resort_id,
          is_chargeable, image_data, image_mime_type, image_file_name, adult_price_usd,
          child_price_usd, child_age_range, is_active
        )
        SELECT
          name, package_type, experience_type, location, description, schedule, $2,
          is_chargeable, image_data, image_mime_type, image_file_name, adult_price_usd,
          child_price_usd, child_age_range, is_active
        FROM packages WHERE id = $1
        RETURNING id, name, resort_id, adult_price_usd, child_price_usd, is_chargeable, is_active
      `, [source.id, parsed.data.resortId]);

      await client.query(`
        INSERT INTO package_inclusions (package_id, label, sort_order, is_active)
        SELECT $2, label, sort_order, is_active
        FROM package_inclusions WHERE package_id = $1
      `, [source.id, rows[0].id]);

      await writeAudit(client, {
        actorId: user.id,
        action: 'package.copy',
        entityType: 'package',
        entityId: rows[0].id,
        beforeData: { sourcePackageId: source.id, sourceResortId: source.resort_id },
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    return Response.json({ package: copied }, { status: 201 });
  } catch (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Resort tujuan sudah memiliki package dengan nama tersebut.' }, { status: 409 });
    }
    return jsonError(error);
  }
}
