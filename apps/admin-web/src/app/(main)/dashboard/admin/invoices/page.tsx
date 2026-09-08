import { getInvoiceDashboard } from "../_lib/admin-data";
import { InvoicesDashboard } from "./_components/invoices-dashboard";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ payout?: string | string[] }>;
}) {
  const data = await getInvoiceDashboard();
  const requestedPayout = (await searchParams).payout;
  const payoutId = typeof requestedPayout === "string" ? requestedPayout : null;
  const selectedPayoutId =
    payoutId && data.workflows.business.some((workflow) => workflow.id === payoutId) ? payoutId : undefined;

  return (
    <InvoicesDashboard
      key={selectedPayoutId ?? "payment"}
      invoices={data.invoices}
      workflows={data.workflows}
      initialTab={selectedPayoutId ? "business" : "payment"}
      initialSelectedId={selectedPayoutId}
    />
  );
}
