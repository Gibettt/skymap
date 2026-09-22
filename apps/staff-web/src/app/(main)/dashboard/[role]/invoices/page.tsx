import { redirect } from "next/navigation";

import { query } from "@ephemeris/db";
import { listCustomerInvoices, listCustomerPaymentWorkflows } from "@ephemeris/db/invoices";

import { requireStaffContext } from "@/lib/staff-access";

import { PaymentInvoicesDashboard } from "./_components/payment-invoices-dashboard";
import type { InvoiceRow, PaymentWorkflowRow } from "./_components/types";

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ payment?: string | string[] }>;
}) {
  const { role } = await params;
  const queryParams = await searchParams;
  const context = await requireStaffContext(role, "staff.finance");

  if (context.role !== "internal" || !context.user.resort_id) {
    redirect(`/dashboard/${context.role}`);
  }

  const database = { query };
  const [invoices, workflows] = await Promise.all([
    listCustomerInvoices(database, { resortId: context.user.resort_id }),
    listCustomerPaymentWorkflows(database, { resortId: context.user.resort_id }),
  ]);
  const requestedPaymentId = Array.isArray(queryParams.payment) ? queryParams.payment[0] : queryParams.payment;
  const latestInvoiceBookingId = invoices.find((invoice: InvoiceRow) => invoice.booking_id)?.booking_id ?? undefined;
  let initialSelectedId = workflows[0]?.id;
  if (workflows.some((workflow: PaymentWorkflowRow) => workflow.id === latestInvoiceBookingId)) {
    initialSelectedId = latestInvoiceBookingId;
  }
  if (workflows.some((workflow: PaymentWorkflowRow) => workflow.id === requestedPaymentId)) {
    initialSelectedId = requestedPaymentId;
  }

  return (
    <PaymentInvoicesDashboard
      initialSelectedId={initialSelectedId}
      invoices={invoices}
      workflows={workflows}
      readOnly={context.readOnly}
    />
  );
}
