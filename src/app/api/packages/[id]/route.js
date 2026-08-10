import { assertSameOrigin, jsonError, requireUser, writeAudit } from '@/lib/auth';
import { transaction } from '@/lib/db';

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id } = await params;
    const body = await request.json();

    const updated = await transaction(async (client) => {
      const before = await client.query('SELECT * FROM packages WHERE id = $1', [id]);
      if (!before.rows[0]) return null;

      const patch = {
        name: body.name ?? before.rows[0].name,
        package_type: body.packageType ?? before.rows[0].package_type,
        experience_type: body.experienceType ?? before.rows[0].experience_type,
        location: body.location ?? before.rows[0].location,
        adult_price_usd: body.adultPriceUsd ?? before.rows[0].adult_price_usd,
        child_price_usd: body.childPriceUsd ?? before.rows[0].child_price_usd,
        is_active: body.isActive ?? before.rows[0].is_active,
      };

      const { rows } = await client.query(
        `UPDATE packages SET
          name = $2,
          package_type = $3,
          experience_type = $4,
          location = $5,
          adult_price_usd = $6,
          child_price_usd = $7,
          is_active = $8
         WHERE id = $1
         RETURNING *`,
        [id, patch.name, patch.package_type, patch.experience_type, patch.location, patch.adult_price_usd, patch.child_price_usd, patch.is_active]
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
