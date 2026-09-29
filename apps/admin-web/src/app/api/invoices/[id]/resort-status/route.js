import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { updateInvoiceResortRecorded } from "@ephemeris/db/invoices";
import { uuidSchema } from "@ephemeris/db/validators/common";
import { invoiceResortStatusSchema } from "@ephemeris/db/validators/invoice";

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("admin.finance", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    const parsed = invoiceResortStatusSchema.safeParse(await parseJsonBody(request));
    if (!parsedId.success || !parsed.success) throw new ApiError(400, "Invalid invoice resort status.");

    const invoice = await transaction(async (client) => {
      const result = await updateInvoiceResortRecorded(client, {
        invoiceId: parsedId.data,
        recordedById: user.id,
        recorded: parsed.data.recorded,
      });
      if (result.error) throw new ApiError(result.status ?? 409, result.error);
      await writeAudit(client, {
        actorId: user.id,
        action: parsed.data.recorded ? "invoice.resort.record" : "invoice.resort.unrecord",
        entityType: "invoice",
        entityId: result.invoice.id,
        beforeData: result.previousStatus,
        afterData: {
          resortRecordedAt: result.invoice.resort_recorded_at,
          resortRecordedBy: result.invoice.resort_recorded_by,
        },
        request,
      });
      return result.invoice;
    });

    return Response.json({ invoice });
  } catch (error) {
    return jsonError(error);
  }
}
