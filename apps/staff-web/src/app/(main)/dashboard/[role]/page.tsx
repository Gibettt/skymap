import { requireStaffContext } from "@/lib/staff-access";

import { StaffOverview } from "./_components/staff-overview";
import { getStaffOverviewData } from "./_lib/overview-data";

export default async function StaffOverviewPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role);
  const data = await getStaffOverviewData(context.user, context.permissions);

  return <StaffOverview role={context.role} permissions={context.permissions} data={data} />;
}
