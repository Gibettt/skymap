import { jsonError } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';

export async function GET(_request, { params }) {
  try {
    const { token } = await params;
    const { rows } = await query(
      `SELECT
        ft.id AS token_id,
        ft.status,
        ft.submitted_at,
        b.booking_code,
        b.guest_name,
        b.event_date,
        p.name AS package_name
       FROM feedback_tokens ft
       JOIN bookings b ON b.id = ft.booking_id
       JOIN packages p ON p.id = b.package_id
       WHERE ft.token = $1
       LIMIT 1`,
      [token]
    );

    if (!rows[0]) return Response.json({ error: 'Feedback link not found' }, { status: 404 });
    return Response.json({ feedback: rows[0] });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request, { params }) {
  try {
    const { token } = await params;
    const body = await request.json();
    const rating = Number(body.rating);
    const comment = String(body.comment || '').trim();

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating must be 1-5' }, { status: 400 });
    }

    const result = await transaction(async (client) => {
      const tokenResult = await client.query(
        'SELECT * FROM feedback_tokens WHERE token = $1 FOR UPDATE',
        [token]
      );
      const feedbackToken = tokenResult.rows[0];
      if (!feedbackToken) return { status: 404 };
      if (feedbackToken.status === 'submitted') return { status: 409 };

      await client.query(
        `INSERT INTO feedback_submissions (booking_id, token_id, rating, comment)
         VALUES ($1, $2, $3, $4)`,
        [feedbackToken.booking_id, feedbackToken.id, rating, comment || null]
      );
      await client.query(
        `UPDATE feedback_tokens
         SET status = 'submitted', submitted_at = now()
         WHERE id = $1`,
        [feedbackToken.id]
      );
      return { status: 200 };
    });

    if (result.status === 404) return Response.json({ error: 'Feedback link not found' }, { status: 404 });
    if (result.status === 409) {
      return Response.json({ error: 'Thank you, you have already submitted your feedback.' }, { status: 409 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
