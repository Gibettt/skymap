import { redirect } from "next/navigation";

import { query } from "@ephemeris/db";
import { listCustomerInvoices, listCustomerPaymentWorkflows } from "@ephemeris/db/invoices";

import { requireStaffContext } from "@/lib/staff-access";

import { PaymentInvoicesDashboard } from "./_components/payment-invoices-dashboard";

export default async function InvoicesPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.finance");

  if (context.role !== "internal" || !context.user.resort_id) {
    redirect(`/dashboard/${context.role}`);
  }

  const database = { query };
  const [invoices, workflows] = await Promise.all([
    listCustomerInvoices(database, { resortId: context.user.resort_id }),
    listCustomerPaymentWorkflows(database, { resortId: context.user.resort_id }),
  ]);

  return <PaymentInvoicesDashboard invoices={invoices} workflows={workflows} readOnly={context.readOnly} />;
}
