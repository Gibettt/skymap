import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { saveMonthlyInvoiceStaffSignature } from "@ephemeris/db/invoices";
import { monthlyInvoiceSignatureSchema } from "@ephemeris/db/validators/invoice";

export async function PATCH(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("staff.finance", ["internal", "external"], { write: true });
    if (!user.resort_id) throw new ApiError(403, "An active resort assignment is required.");

    const parsed = monthlyInvoiceSignatureSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw new ApiError(400, "Select a valid month and provide a valid signature image.");

    const result = await transaction(async (client) => {
      const saved = await saveMonthlyInvoiceStaffSignature(client, {
        resortId: user.resort_id,
        signedById: user.id,
        period: parsed.data.period,
        signatureDataUrl: parsed.data.signatureDataUrl,
      });
      if (saved.error) throw new ApiError(saved.status ?? 409, saved.error);

      await writeAudit(client, {
        actorId: user.id,
        action: saved.previousSignature ? "invoice.monthly.signature.update" : "invoice.monthly.signature.create",
        entityType: "monthly_invoice_staff_signature",
        entityId: saved.signature.id,
        beforeData: saved.previousSignature,
        afterData: {
          period: parsed.data.period,
          signerName: saved.signature.signer_name,
          signedAt: saved.signature.signed_at,
        },
        request,
      });
      return saved.signature;
    });

    return Response.json({ signature: result });
  } catch (error) {
    return jsonError(error);
  }
}
