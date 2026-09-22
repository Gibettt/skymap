import { getInvoiceDashboard } from "../_lib/admin-data";
import { InvoicesDashboard } from "./_components/invoices-dashboard";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string | string[]; payout?: string | string[] }>;
}) {
  const data = await getInvoiceDashboard();
  const query = await searchParams;
  const requestedPayout = query.payout;
  const payoutId = typeof requestedPayout === "string" ? requestedPayout : null;
  const selectedPayoutId =
    payoutId && data.workflows.business.some((workflow) => workflow.id === payoutId) ? payoutId : undefined;
  const requestedPayment = typeof query.payment === "string" ? query.payment : null;
  const latestInvoiceBookingId = data.invoices.find((invoice) => invoice.invoice_type === "customer")?.booking_id;
  const fallbackPaymentId = data.workflows.payment.some((workflow) => workflow.id === latestInvoiceBookingId)
    ? (latestInvoiceBookingId ?? undefined)
    : data.workflows.payment[0]?.id;
  const initialPaymentId = data.workflows.payment.some((workflow) => workflow.id === requestedPayment)
    ? (requestedPayment ?? undefined)
    : fallbackPaymentId;

  return (
    <InvoicesDashboard
      key={selectedPayoutId ?? initialPaymentId ?? "payment"}
      initialPaymentId={initialPaymentId}
      invoices={data.invoices}
      workflows={data.workflows}
      initialTab={selectedPayoutId ? "business" : "payment"}
      initialSelectedId={selectedPayoutId}
    />
  );
}
