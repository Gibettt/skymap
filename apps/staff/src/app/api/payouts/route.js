import { assertSameOrigin, jsonError, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { calculatePayoutSummary } from '@ephemeris/finance';

const bookingSelect = `
  SELECT b.status, b.signed_by_guest, b.staff_commission_5_usd, b.child_count, p.package_type
  FROM bookings b
  JOIN packages p ON p.id = b.package_id
  WHERE b.resort_id = $1
`;

const payoutSelect = `
  SELECT pr.*, u.name AS requester_name, r.name AS resort_name
  FROM payout_requests pr
  JOIN users u ON u.id = pr.requester_id
  LEFT JOIN resorts r ON r.id = pr.resort_id
  WHERE pr.resort_id = $1
  ORDER BY pr.created_at DESC
`;

function cleanText(value, max = 160) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : '';
}

async function loadSummary(resortId, client = { query }) {
  const bookingResult = await client.query(bookingSelect, [resortId]);
  const payoutResult = await client.query(payoutSelect, [resortId]);

  return {
    requests: payoutResult.rows,
    summary: calculatePayoutSummary(bookingResult.rows, payoutResult.rows),
  };
}

export async function GET() {
  try {
    const user = await requireUser(['external']);
    if (!user.resort_id) return Response.json({ error: 'External resort profile is not configured' }, { status: 403 });

    return Response.json(await loadSummary(user.resort_id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['external']);
    if (!user.resort_id) return Response.json({ error: 'External resort profile is not configured' }, { status: 403 });

    const body = await request.json();
    const amountUsd = Number(body.amountUsd);
    const paymentMethod = cleanText(body.paymentMethod, 40);
    const accountName = cleanText(body.accountName, 120);
    const accountNumber = cleanText(body.accountNumber, 120);
    const notes = cleanText(body.notes, 500) || null;

    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || !paymentMethod || !accountName || !accountNumber) {
      return Response.json({ error: 'Invalid payout request data' }, { status: 400 });
    }

    const created = await transaction(async (client) => {
      const { summary } = await loadSummary(user.resort_id, client);
      if (Math.round(amountUsd * 100) > Math.round(summary.availableUsd * 100)) {
        return { error: 'Amount exceeds available payout balance' };
      }

      const { rows } = await client.query(
        `INSERT INTO payout_requests
          (requester_id, resort_id, amount_usd, commission_usd, star_bonus_usd, star_points, full_stars,
           payment_method, account_name, account_number, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          user.id,
          user.resort_id,
          amountUsd,
          summary.commissionUsd,
          summary.starBonusUsd,
          summary.starPoints,
          summary.fullStars,
          paymentMethod,
          accountName,
          accountNumber,
          notes,
        ]
      );

      await writeAudit(client, {
        actorId: user.id,
        action: 'payout.request',
        entityType: 'payout_request',
        entityId: rows[0].id,
        afterData: rows[0],
        request,
      });
      return { payout: rows[0] };
    });

    if (created.error) return Response.json({ error: created.error }, { status: 400 });
    return Response.json(created, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
