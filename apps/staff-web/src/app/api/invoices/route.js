import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { query, transaction } from "@ephemeris/db";
import { issueCustomerInvoice, listCustomerInvoices, listCustomerPaymentWorkflows } from "@ephemeris/db/invoices";
import { issueInvoiceSchema } from "@ephemeris/db/validators/invoice";

function requireResort(user) {
  if (!user.resort_id) throw new ApiError(403, "An active resort assignment is required.");
  return user.resort_id;
}

export async function GET() {
  try {
    const user = await requirePermission("staff.finance", ["internal"]);
    const resortId = requireResort(user);
    const database = { query };
    const [invoices, payment] = await Promise.all([
      listCustomerInvoices(database, { resortId }),
      listCustomerPaymentWorkflows(database, { resortId }),
    ]);
    return Response.json({ invoices, workflows: { payment } });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("staff.finance", ["internal"], { write: true });
    const resortId = requireResort(user);
    const parsed = issueInvoiceSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success || parsed.data.type !== "customer") {
      throw new ApiError(400, "Select a valid customer payment.");
    }

    const result = await transaction(async (client) => {
      const issued = await issueCustomerInvoice(client, {
        bookingId: parsed.data.sourceId,
        issuedById: user.id,
        resortId,
      });
      if (issued.error) throw new ApiError(issued.status ?? 409, issued.error);

      if (issued.created) {
        await writeAudit(client, {
          actorId: user.id,
          action: "invoice.issue.customer",
          entityType: "invoice",
          entityId: issued.invoice.id,
          afterData: issued.invoice,
          request,
        });
      }
      return issued;
    });

    return Response.json(
      { invoice: result.invoice, created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
