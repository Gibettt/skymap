import { requireStaffContext } from "@/lib/staff-access";

import { SkyEvents } from "./_components/sky-events";

export default async function SkyEventsPage() {
  const context = await requireStaffContext("internal", "staff.sky_guide");
  return <SkyEvents readOnly={context.readOnly} />;
}
