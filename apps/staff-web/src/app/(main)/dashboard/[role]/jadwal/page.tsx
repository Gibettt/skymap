import { requireStaffContext } from "@/lib/staff-access";

import { StaffCalendar } from "./_components/staff-calendar";

export default async function CalendarPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.bookings");

  return <StaffCalendar role={context.role} readOnly={context.readOnly} />;
}
