import { ApiError, assertSameOrigin, jsonError, requirePermission, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function extension(fileName) {
  return String(fileName || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
}

async function parseEventId(params) {
  const { id } = await params;
  const parsed = uuidSchema.safeParse(id);
  if (!parsed.success) throw new ApiError(400, 'Invalid event ID');
  return parsed.data;
}

export async function GET(_request, { params }) {
  try {
    await requirePermission('admin.calendar', ['admin']);
    const id = await parseEventId(params);
    const { rows } = await query(
      'SELECT image_data, image_mime_type FROM sky_events WHERE id = $1 AND image_data IS NOT NULL',
      [id],
    );
    if (!rows[0]) throw new ApiError(404, 'Event image not found');
    return new Response(rows[0].image_data, {
      headers: {
        'Content-Type': rows[0].image_mime_type || 'image/jpeg',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('admin.calendar', ['admin'], { write: true });
    const id = await parseEventId(params);
    const file = (await request.formData()).get('image');
    if (!file || typeof file !== 'object' || file.size === 0) throw new ApiError(400, 'Select an image to upload');
    if (file.size > MAX_IMAGE_SIZE) throw new ApiError(400, 'Image must not exceed 2MB');
    if (!ALLOWED_TYPES.includes(file.type)) throw new ApiError(400, 'Image must be JPG, PNG, or WEBP');
    if (!ALLOWED_EXTENSIONS.includes(extension(file.name))) throw new ApiError(400, 'Invalid image file extension');
    const imageData = Buffer.from(await file.arrayBuffer());
    const fileName = String(file.name).slice(0, 255);

    const updated = await transaction(async (client) => {
      const before = await client.query('SELECT id, image_file_name FROM sky_events WHERE id = $1 FOR UPDATE', [id]);
      if (!before.rows[0]) return null;
      await client.query(
        `UPDATE sky_events SET image_data = $2, image_mime_type = $3, image_file_name = $4,
          image_url = NULL, updated_by = $5 WHERE id = $1`,
        [id, imageData, file.type, fileName, user.id],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.image_update',
        entityType: 'sky_event',
        entityId: id,
        beforeData: { imageFileName: before.rows[0].image_file_name },
        afterData: { imageFileName: fileName, imageMimeType: file.type },
        request,
      });
      return true;
    });
    if (!updated) throw new ApiError(404, 'Sky event not found');
    return Response.json({ imageUrl: `/api/sky-events/${id}/image` });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('admin.calendar', ['admin'], { write: true });
    const id = await parseEventId(params);
    const updated = await transaction(async (client) => {
      const before = await client.query('SELECT id, image_file_name FROM sky_events WHERE id = $1 FOR UPDATE', [id]);
      if (!before.rows[0]) return null;
      await client.query(
        `UPDATE sky_events SET image_data = NULL, image_mime_type = NULL, image_file_name = NULL,
          image_url = NULL, updated_by = $2 WHERE id = $1`,
        [id, user.id],
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'sky_event.image_remove',
        entityType: 'sky_event',
        entityId: id,
        beforeData: { imageFileName: before.rows[0].image_file_name },
        afterData: { imageFileName: null },
        request,
      });
      return true;
    });
    if (!updated) throw new ApiError(404, 'Sky event not found');
    return Response.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
