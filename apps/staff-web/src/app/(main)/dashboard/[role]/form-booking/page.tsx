import { redirect } from "next/navigation";

import { requireStaffContext } from "@/lib/staff-access";

export default async function NewBookingPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.bookings");
  if (context.readOnly) redirect(`/dashboard/${context.role}/bookings`);

  redirect(`/dashboard/${context.role}/bookings?new=1`);
}
