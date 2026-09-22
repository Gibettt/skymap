import { ApiError, assertSameOrigin, jsonError, requirePermission, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function extension(fileName) {
  return String(fileName || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
}

export async function GET() {
  try {
    const user = await requirePermission('staff.resort_profile', ['internal']);
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const { rows } = await query(
      `SELECT image_data, image_mime_type FROM resorts
       WHERE id = $1 AND image_data IS NOT NULL`,
      [user.resort_id],
    );
    if (!rows[0]) throw new ApiError(404, 'Resort image not found');
    return new Response(rows[0].image_data, {
      headers: {
        'Content-Type': rows[0].image_mime_type || 'image/jpeg',
        'Cache-Control': 'private, no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('staff.resort_profile', ['internal'], { write: true });
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const file = (await request.formData()).get('image');
    if (!file || typeof file !== 'object' || file.size === 0) throw new ApiError(400, 'Select an image to upload');
    if (file.size > MAX_IMAGE_SIZE) throw new ApiError(400, 'Image must not exceed 2MB');
    if (!ALLOWED_TYPES.includes(file.type)) throw new ApiError(400, 'Image must be JPG, PNG, or WEBP');
    if (!ALLOWED_EXTENSIONS.includes(extension(file.name))) throw new ApiError(400, 'Invalid image file extension');
    const imageData = Buffer.from(await file.arrayBuffer());
    const fileName = String(file.name).slice(0, 255);

    const updated = await transaction(async (client) => {
      const before = await client.query(
        'SELECT id, image_file_name FROM resorts WHERE id = $1 FOR UPDATE',
        [user.resort_id],
      );
      if (!before.rows[0]) return null;
      await client.query(
        `UPDATE resorts SET image_data = $2, image_mime_type = $3, image_file_name = $4
         WHERE id = $1`,
        [user.resort_id, imageData, file.type, fileName],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'resort.public_image.update',
        entityType: 'resort',
        entityId: user.resort_id,
        beforeData: { imageFileName: before.rows[0].image_file_name },
        afterData: { imageFileName: fileName, imageMimeType: file.type },
        request,
      });
      return true;
    });
    if (!updated) throw new ApiError(404, 'Assigned resort not found');
    return Response.json({ imageUrl: `/api/public-resort-profile/image?v=${Date.now()}`, imageFileName: fileName });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('staff.resort_profile', ['internal'], { write: true });
    if (!user.resort_id) throw new ApiError(403, 'Staff resort profile is not configured');
    const updated = await transaction(async (client) => {
      const before = await client.query(
        'SELECT id, image_file_name FROM resorts WHERE id = $1 FOR UPDATE',
        [user.resort_id],
      );
      if (!before.rows[0]) return null;
      await client.query(
        `UPDATE resorts SET image_data = NULL, image_mime_type = NULL, image_file_name = NULL
         WHERE id = $1`,
        [user.resort_id],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'resort.public_image.remove',
        entityType: 'resort',
        entityId: user.resort_id,
        beforeData: { imageFileName: before.rows[0].image_file_name },
        afterData: { imageFileName: null },
        request,
      });
      return true;
    });
    if (!updated) throw new ApiError(404, 'Assigned resort not found');
    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
