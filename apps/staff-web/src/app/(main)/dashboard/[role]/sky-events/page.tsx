import { requireStaffContext } from "@/lib/staff-access";

import { SkyEvents } from "./_components/sky-events";

export default async function SkyEventsPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const context = await requireStaffContext(role, "staff.sky_guide");
  // External staff follow the resort calendar; internal staff and admins maintain it.
  return <SkyEvents readOnly={context.readOnly || context.role === "external"} />;
}
