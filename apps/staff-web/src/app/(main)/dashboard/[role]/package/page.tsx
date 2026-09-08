import { requireStaffContext } from "@/lib/staff-access";

import { StaffPackages } from "./_components/staff-packages";

export default async function PackagesPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.bookings");

  return <StaffPackages role={context.role} />;
}
