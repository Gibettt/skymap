import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { updateInvoiceCustomerSignature, updateInvoiceStaffSignature } from "@ephemeris/db/invoices";
import { uuidSchema } from "@ephemeris/db/validators/common";

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(["internal", "external", "admin"]);
    if (user.access_role_level === "read_only") {
      throw new ApiError(403, "This role has read-only access.");
    }

    const { id: rawId } = await params;
    const parsedId = uuidSchema.safeParse(rawId);
    if (!parsedId.success) throw new ApiError(400, "Invalid invoice ID.");

    const body = await parseJsonBody(request);
    const signatureDataUrl = body?.signatureDataUrl ? String(body.signatureDataUrl) : null;
    const signerName = body?.signerName ? String(body.signerName).trim().slice(0, 200) : null;
    const target = body?.target === "staff" ? "staff" : "guest";

    const invoice = await transaction(async (client) => {
      const result = target === "staff"
        ? await updateInvoiceStaffSignature(client, {
            invoiceId: parsedId.data,
            signatureDataUrl,
            signerName,
            resortId: user.role === "admin" ? null : user.resort_id,
          })
        : await updateInvoiceCustomerSignature(client, {
            invoiceId: parsedId.data,
            signatureDataUrl,
            signerName,
            signedById: user.id,
            resortId: user.role === "admin" ? null : user.resort_id,
          });

      if (result.error) throw new ApiError(result.status ?? 409, result.error);

      await writeAudit(client, {
        actorId: user.id,
        action: signatureDataUrl
          ? (target === "staff" ? "invoice.staff_signature.capture" : "invoice.signature.capture")
          : (target === "staff" ? "invoice.staff_signature.clear" : "invoice.signature.clear"),
        entityType: "invoice",
        entityId: result.invoice.id,
        beforeData: result.previousSignature,
        afterData: target === "staff"
          ? {
              staffSignatureSignerName: result.invoice.staff_signer_name,
              staffSignedAt: result.invoice.staff_signed_at,
            }
          : {
              signatureSignerName: result.invoice.signature_signer_name,
              signedBy: result.invoice.signed_by,
              signedAt: result.invoice.signed_at,
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
