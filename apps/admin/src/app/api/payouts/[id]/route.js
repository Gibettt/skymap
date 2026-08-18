import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { transaction, refreshAfterPayoutChange } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { reviewPayoutSchema } from '@ephemeris/db/validators/payout';
import { emit, EventTypes } from '@ephemeris/events';

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const id = parseId.data;
    const parsed = reviewPayoutSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data payout tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const { status, adminNotes } = parsed.data;

    const updated = await transaction(async (client) => {
      const before = await client.query(
        `SELECT pr.*, u.role AS requester_role
         FROM payout_requests pr
         JOIN users u ON u.id = pr.requester_id
         WHERE pr.id = $1`,
        [id]
      );
      if (!before.rows[0]) return null;

      const current = before.rows[0];
      if (current.status === 'paid' || current.status === 'rejected') {
        return { error: 'Payout request is already closed' };
      }
      if (status === 'approved' && current.status !== 'requested') {
        return { error: 'Only requested payouts can be approved' };
      }
      if (status === 'paid' && !['requested', 'approved'].includes(current.status)) {
        return { error: 'Only requested or approved payouts can be paid' };
      }

      const { rows } = await client.query(
        `UPDATE payout_requests SET
          status = $2,
          admin_notes = COALESCE($3, admin_notes),
          reviewed_by = $4,
          reviewed_at = CASE WHEN reviewed_at IS NULL THEN now() ELSE reviewed_at END,
          paid_at = CASE WHEN $2 = 'paid' THEN now() ELSE paid_at END
         WHERE id = $1
         RETURNING *`,
        [id, status, adminNotes, user.id]
      );

      await writeAudit(client, {
        actorId: user.id,
        action: `payout.${status}`,
        entityType: 'payout_request',
        entityId: id,
        beforeData: current,
        afterData: rows[0],
        request,
      });

      // Emit domain event for payout review
      const eventType = status === 'paid'
        ? EventTypes.PAYOUT_PAID
        : (status === 'approved' ? EventTypes.PAYOUT_APPROVED : EventTypes.PAYOUT_REJECTED);

      await emit(eventType, {
        payoutId: id,
        requesterId: current.requester_id,
        requesterRole: current.requester_role,
        status,
        amountUsd: rows[0].amount_usd,
      }, { client, actorId: user.id });

      // Refresh CQRS staff performance and KPI views
      await refreshAfterPayoutChange(client);

      return { payout: rows[0] };
    });

    if (!updated) return Response.json({ error: 'Payout request not found' }, { status: 404 });
    if (updated.error) return Response.json({ error: updated.error }, { status: 400 });
    return Response.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
