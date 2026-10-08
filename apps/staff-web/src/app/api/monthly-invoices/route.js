import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { transaction } from "@ephemeris/db";
import { submitMonthlyInvoices } from "@ephemeris/db/invoices";
import { monthlyInvoiceSubmissionSchema } from "@ephemeris/db/validators/invoice";

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("staff.finance", ["internal", "external"], { write: true });
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

      const periodLabel = parsed.data.period;
      const resortName = submitted.submission.resort_name || "Resort";
      const staffName = submitted.submission.submitted_by_name || user.name || "Staff";
      const invoiceCount = submitted.submission.invoices?.length ?? 0;
      const title = submitted.resubmitted
        ? `Resubmitted monthly invoice from ${resortName}`
        : `New monthly invoice from ${resortName}`;
      const message = `Monthly invoice for period ${periodLabel} (${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"}) submitted by ${staffName}.`;
      const meta = `${resortName} · ${periodLabel}`;

      await client.query(
        `INSERT INTO notifications (
          recipient_user_id, type, source_table, source_id, title, message, meta, link, created_at
        )
        SELECT
          admin_user.id,
          'invoice',
          'monthly_invoice_submissions',
          $1,
          $2,
          $3,
          $4,
          '/dashboard/admin/invoices',
          now()
        FROM users admin_user
        WHERE admin_user.role = 'admin' AND admin_user.status = 'active'
        ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          meta = EXCLUDED.meta,
          link = EXCLUDED.link,
          read_at = NULL,
          created_at = now()`,
        [submitted.submission.id, title, message, meta],
      );

      return submitted;
    });

    return Response.json(result, { status: result.resubmitted ? 200 : 201 });
  } catch (error) {
    return jsonError(error);
  }
}
