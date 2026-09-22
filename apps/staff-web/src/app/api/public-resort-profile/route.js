import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { publicResortProfileSchema } from '@ephemeris/db/validators/resort';

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    slug: row.slug,
    location: row.location || '',
    publicDescription: row.public_description || '',
    contactEmail: row.contact_email || '',
    whatsappNumber: row.whatsapp_number || '',
    hasImage: Number(row.has_image) === 1,
    imageFileName: row.image_file_name || null,
    imageUrl: row.has_image ? '/api/public-resort-profile/image' : null,
  };
}

export async function GET() {
  try {
    const user = await requirePermission('staff.resort_profile', ['internal']);
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const { rows } = await query(
      `SELECT id, name, code, slug, location, public_description, contact_email,
              whatsapp_number, image_file_name, image_data IS NOT NULL AS has_image
       FROM resorts WHERE id = $1`,
      [user.resort_id],
    );
    if (!rows[0]) throw new ApiError(404, 'Assigned resort not found');
    return Response.json({ profile: mapProfile(rows[0]) });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('staff.resort_profile', ['internal'], { write: true });
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const parsed = publicResortProfileSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Public resort profile is invalid', details: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await transaction(async (client) => {
      const before = await client.query(
        `SELECT id, name, code, slug, location, public_description, contact_email,
                whatsapp_number, image_file_name, image_data IS NOT NULL AS has_image
         FROM resorts WHERE id = $1 FOR UPDATE`,
        [user.resort_id],
      );
      if (!before.rows[0]) return null;
      const { rows } = await client.query(
        `UPDATE resorts
         SET location = $2, public_description = $3, contact_email = $4, whatsapp_number = $5
         WHERE id = $1
         RETURNING id, name, code, slug, location, public_description, contact_email,
                   whatsapp_number, image_file_name, image_data IS NOT NULL AS has_image`,
        [
          user.resort_id,
          parsed.data.location,
          parsed.data.publicDescription || null,
          parsed.data.contactEmail,
          parsed.data.whatsappNumber || null,
        ],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'resort.public_profile.update',
        entityType: 'resort',
        entityId: user.resort_id,
        beforeData: mapProfile(before.rows[0]),
        afterData: mapProfile(rows[0]),
        request,
      });
      return rows[0];
    });

    if (!updated) throw new ApiError(404, 'Assigned resort not found');
    return Response.json({ profile: mapProfile(updated) });
  } catch (error) {
    return jsonError(error);
  }
}
