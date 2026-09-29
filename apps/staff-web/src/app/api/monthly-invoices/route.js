import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { submitMonthlyInvoices } from "@ephemeris/db/invoices";
import { monthlyInvoiceSubmissionSchema } from "@ephemeris/db/validators/invoice";

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("staff.finance", ["internal"], { write: true });
    if (!user.resort_id) throw new ApiError(403, "An active resort assignment is required.");
    const parsed = monthlyInvoiceSubmissionSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) throw new ApiError(400, "Select a valid invoice month.");

    const result = await transaction(async (client) => {
      const submitted = await submitMonthlyInvoices(client, {
        resortId: user.resort_id,
        submittedById: user.id,
        period: parsed.data.period,
      });
      if (submitted.error) throw new ApiError(submitted.status ?? 409, submitted.error);
      await writeAudit(client, {
        actorId: user.id,
        action: submitted.resubmitted ? "invoice.monthly.resubmit" : "invoice.monthly.submit",
        entityType: "monthly_invoice_submission",
        entityId: submitted.submission.id,
        afterData: {
          period: parsed.data.period,
          resortId: user.resort_id,
          invoiceCount: submitted.submission.invoices.length,
        },
        request,
      });
      return submitted;
    });

    return Response.json(result, { status: result.resubmitted ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
