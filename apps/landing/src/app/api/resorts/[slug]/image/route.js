import { jsonError } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const { slug } = await params;
    const { rows } = await query(
      `SELECT image_data, image_mime_type
       FROM resorts
       WHERE slug = $1 AND status = 'active' AND image_data IS NOT NULL
       LIMIT 1`,
      [slug],
    );
    if (!rows[0]) return Response.json({ error: 'Resort image not found' }, { status: 404 });

    return new Response(rows[0].image_data, {
      headers: {
        'Content-Type': rows[0].image_mime_type || 'image/jpeg',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
