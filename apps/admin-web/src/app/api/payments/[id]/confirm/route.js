import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { refreshAfterBookingChange, transaction } from "@ephemeris/db";
import { issueCustomerInvoice } from "@ephemeris/db/invoices";
import { confirmCustomerPayment } from "@ephemeris/db/payments";
import { uuidSchema } from "@ephemeris/db/validators/common";
import { confirmCustomerPaymentSchema } from "@ephemeris/db/validators/payment";

export async function POST(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("admin.finance", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid booking id.");

    const parsed = confirmCustomerPaymentSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      throw new ApiError(400, "Invalid payment confirmation data.");
    }

    const result = await transaction(async (client) => {
      const payment = await confirmCustomerPayment(client, {
        bookingId: parsedId.data,
        confirmedById: user.id,
        paymentMethod: parsed.data.paymentMethod,
        reference: parsed.data.reference,
        notes: parsed.data.notes,
      });
      if (payment.error) throw new ApiError(payment.status ?? 409, payment.error);

      if (payment.confirmed) {
        await writeAudit(client, {
          actorId: user.id,
          action: "customer_payment.confirm",
          entityType: "booking",
          entityId: payment.booking.id,
          beforeData: { payment_status: "pending" },
          afterData: {
            payment_status: payment.booking.payment_status,
            payment_method: payment.booking.payment_method,
            payment_confirmed_at: payment.booking.payment_confirmed_at,
            payment_reference: payment.booking.payment_reference,
          },
          request,
        });
      }

      const issued = await issueCustomerInvoice(client, {
        bookingId: parsedId.data,
        issuedById: user.id,
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

      if (payment.confirmed) await refreshAfterBookingChange(client);
      return {
        booking: payment.booking,
        invoice: issued.invoice,
        confirmed: payment.confirmed,
        created: issued.created,
      };
    });

    return Response.json(result, { status: result.confirmed || result.created ? 201 : 200 });
  } catch (error) {
    return jsonError(error);
  }
}
