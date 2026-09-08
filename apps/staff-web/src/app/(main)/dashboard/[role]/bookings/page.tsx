import { requireStaffContext } from "@/lib/staff-access";

import { StaffBookings } from "./_components/staff-bookings";

export default async function BookingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ new?: string | string[] }>;
}) {
  const { role } = await params;
  const query = await searchParams;
  const context = await requireStaffContext(role, "staff.bookings");

  return <StaffBookings role={context.role} initialNewBooking={query.new === "1" && !context.readOnly} />;
}
