import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { query, transaction } from "@ephemeris/db";
import { issueCustomerInvoice, issuePayoutInvoice, listInvoices, listInvoiceWorkflows } from "@ephemeris/db/invoices";
import { issueInvoiceSchema } from "@ephemeris/db/validators/invoice";

export async function GET() {
  try {
    await requirePermission("admin.finance", ["admin"]);
    const database = { query };
    const [invoices, workflows] = await Promise.all([listInvoices(database), listInvoiceWorkflows(database)]);
    return Response.json({ invoices, workflows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("admin.finance", ["admin"], { write: true });
    const parsed = issueInvoiceSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw new ApiError(400, "Select a valid invoice type and source.");
    }

    const result = await transaction(async (client) => {
      const issued =
        parsed.data.type === "staff_payout"
          ? await issuePayoutInvoice(client, {
              payoutRequestId: parsed.data.sourceId,
              issuedById: user.id,
            })
          : await issueCustomerInvoice(client, {
              bookingId: parsed.data.sourceId,
              issuedById: user.id,
            });

      if (issued.error) return issued;
      if (issued.created) {
        await writeAudit(client, {
          actorId: user.id,
          action: `invoice.issue.${parsed.data.type}`,
          entityType: "invoice",
          entityId: issued.invoice.id,
          afterData: issued.invoice,
          request,
        });
      }
      return issued;
    });

    if (result.error) throw new ApiError(result.status ?? 409, result.error);
    return Response.json({ invoice: result.invoice, created: result.created }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return jsonError(error);
  }
}
