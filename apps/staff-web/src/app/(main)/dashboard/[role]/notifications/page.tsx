import { requireStaffContext } from "@/lib/staff-access";

import { NotificationsCenter } from "./_components/notifications-center";

export default async function NotificationsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.notifications");

  return <NotificationsCenter role={context.role} readOnly={context.readOnly} />;
}
