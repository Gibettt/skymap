import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { reviewMonthlyInvoiceSubmission } from "@ephemeris/db/invoices";
import { uuidSchema } from "@ephemeris/db/validators/common";
import { monthlyInvoiceReviewSchema } from "@ephemeris/db/validators/invoice";

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("admin.finance", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    const parsed = monthlyInvoiceReviewSchema.safeParse(await parseJsonBody(request));
    if (!parsedId.success || !parsed.success) throw new ApiError(400, "Invalid monthly invoice status.");

    const submission = await transaction(async (client) => {
      const result = await reviewMonthlyInvoiceSubmission(client, {
        submissionId: parsedId.data,
        resortId: parsed.data.resortId || null,
        periodStart: parsed.data.periodStart || null,
        reviewedById: user.id,
        reviewed: parsed.data.reviewed,
        adminSignatureDataUrl: parsed.data.signatureDataUrl || null,
        adminSignerName: parsed.data.signerName || user.name || "Admin",
      });
      if (result.error) throw new ApiError(result.status ?? 409, result.error);
      await writeAudit(client, {
        actorId: user.id,
        action: parsed.data.reviewed ? "invoice.monthly.review" : "invoice.monthly.reopen",
        entityType: "monthly_invoice_submission",
        entityId: result.submission.id,
        beforeData: result.previousStatus,
        afterData: {
          status: result.submission.status,
          reviewedBy: result.submission.reviewed_by,
          reviewedAt: result.submission.reviewed_at,
        },
        request,
      });
      return result.submission;
    });

    return Response.json({ submission });
  } catch (error) {
    return jsonError(error);
  }
}
