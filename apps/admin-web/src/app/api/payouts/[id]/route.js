import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { refreshAfterPayoutChange, transaction } from "@ephemeris/db";
import { issuePayoutInvoice } from "@ephemeris/db/invoices";
import { uuidSchema } from "@ephemeris/db/validators/common";
import { payoutTransitionError, reviewPayoutSchema } from "@ephemeris/db/validators/payout";
import { EventTypes, emit } from "@ephemeris/events";

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("admin.finance", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: "Invalid payout ID" }, { status: 400 });
    const id = parseId.data;
    const parsed = reviewPayoutSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Invalid payout data", details: parsed.error.flatten() }, { status: 400 });
    }
    const { status, adminNotes } = parsed.data;

    const updated = await transaction(async (client) => {
      const before = await client.query(
        `SELECT pr.*, u.role AS requester_role
         FROM payout_requests pr
         JOIN users u ON u.id = pr.requester_id
         WHERE pr.id = $1
         FOR UPDATE`,
        [id],
      );
      if (!before.rows[0]) return null;

      const current = before.rows[0];
      const transitionError = payoutTransitionError(current.status, status);
      if (transitionError) throw new ApiError(409, transitionError);

      const { rows } = await client.query(
        `UPDATE payout_requests SET
          status = $2,
          admin_notes = COALESCE($3, admin_notes),
          reviewed_by = $4,
          reviewed_at = now(),
          paid_at = CASE WHEN $2 = 'completed' THEN now() ELSE paid_at END
         WHERE id = $1
         RETURNING *`,
        [id, status, adminNotes, user.id],
      );

      await writeAudit(client, {
        actorId: user.id,
        action: `payout.${status}`,
        entityType: "payout_request",
        entityId: id,
        beforeData: current,
        afterData: rows[0],
        request,
      });

      // Emit domain event for payout review
      let eventType = EventTypes.PAYOUT_REJECTED;
      if (status === "completed") eventType = EventTypes.PAYOUT_COMPLETED;
      else if (status === "processed") eventType = EventTypes.PAYOUT_PROCESSED;

      await emit(
        eventType,
        {
          payoutId: id,
          requesterId: current.requester_id,
          requesterRole: current.requester_role,
          status,
          amountUsd: rows[0].amount_usd,
        },
        { client, actorId: user.id },
      );

      // Refresh CQRS staff performance and KPI views
      await refreshAfterPayoutChange(client);

      const invoiceResult =
        status === "completed" ? await issuePayoutInvoice(client, { payoutRequestId: id, issuedById: user.id }) : null;
      if (invoiceResult?.error) throw new ApiError(invoiceResult.status ?? 409, invoiceResult.error);

      if (invoiceResult?.created) {
        await writeAudit(client, {
          actorId: user.id,
          action: "invoice.issue.staff_payout",
          entityType: "invoice",
          entityId: invoiceResult.invoice.id,
          afterData: invoiceResult.invoice,
          request,
        });
      }

      return { payout: rows[0], invoice: invoiceResult?.invoice ?? null };
    });

    if (!updated) return Response.json({ error: "Payout request not found" }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
