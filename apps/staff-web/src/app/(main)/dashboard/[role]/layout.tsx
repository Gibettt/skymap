import type { ReactNode } from "react";

import { requireStaffContext } from "@/lib/staff-access";

export default async function StaffRoleLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ role: string }> }>) {
  const { role } = await params;
  await requireStaffContext(role);
  return children;
}
