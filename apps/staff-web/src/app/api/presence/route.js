import { assertSameOrigin, jsonError, parseJsonBody, requireUser } from '@ephemeris/auth';
import { query } from '@ephemeris/db';

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['internal', 'external']);
    const body = await parseJsonBody(request);
    if (typeof body.active !== 'boolean') {
      return Response.json({ error: 'Invalid presence state' }, { status: 400 });
    }

    await query(
      `UPDATE users
       SET last_seen_at = now(),
           last_active_at = CASE WHEN $2 THEN now() ELSE last_active_at END
       WHERE id = $1`,
      [user.id, body.active]
    );
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
