import { jsonError, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';

export async function GET(_request, { params }) {
  try {
    await requireUser(['internal', 'external']);
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });

    const { rows } = await query(
      'SELECT image_data, image_mime_type FROM packages WHERE id = $1 AND is_active = true AND image_data IS NOT NULL',
      [parseId.data]
    );
    if (!rows[0]) return Response.json({ error: 'Gambar tidak ditemukan' }, { status: 404 });

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
