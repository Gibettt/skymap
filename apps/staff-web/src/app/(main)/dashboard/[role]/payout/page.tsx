import { requireStaffContext } from "@/lib/staff-access";

import { PayoutDashboard } from "./_components/payout-dashboard";

export default async function PayoutPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.finance");

  return <PayoutDashboard role={context.role} readOnly={context.readOnly} />;
}
