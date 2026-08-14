import { assertSameOrigin, jsonError, parseJsonBody } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { submitFeedbackSchema } from '@ephemeris/db/validators/feedback';

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
    await assertSameOrigin(request);
    const { token } = await params;
    const parsed = submitFeedbackSchema.safeParse(await parseJsonBody(request));

    if (!parsed.success) {
      return Response.json({ error: 'Data feedback tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }

    const { rating, comment } = parsed.data;

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
        [feedbackToken.booking_id, feedbackToken.id, rating, comment]
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
