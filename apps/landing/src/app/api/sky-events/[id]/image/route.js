import { ApiError, jsonError } from '@ephemeris/auth';
import { query } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';

export async function GET(_request, { params }) {
  try {
    const { id: rawId } = await params;
    const id = uuidSchema.safeParse(rawId);
    if (!id.success) throw new ApiError(400, 'Invalid event ID');
    const { rows } = await query(
      `SELECT image_data, image_mime_type FROM sky_events
       WHERE id = $1 AND status = 'published' AND is_published = true AND image_data IS NOT NULL`,
      [id.data],
    );
    if (!rows[0]) throw new ApiError(404, 'Event image not found');
    return new Response(rows[0].image_data, {
      headers: {
        'Content-Type': rows[0].image_mime_type || 'image/jpeg',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
