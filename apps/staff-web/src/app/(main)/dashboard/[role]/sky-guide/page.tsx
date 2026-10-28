import { requireStaffContext } from "@/lib/staff-access";

import { SkyGuide } from "./_components/sky-guide";

export default async function SkyGuidePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  await requireStaffContext(role, "staff.sky_guide");
  return <SkyGuide />;
}
