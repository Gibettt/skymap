import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireStaffContext } from "@/lib/staff-access";

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  if (role === "external") {
    return {
      title: "Star Portal",
    };
  }
  return {
    title: "SpaceCat ASTROTOURISM Staff",
  };
}

export default async function StaffRoleLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ role: string }> }>) {
  const { role } = await params;
  await requireStaffContext(role);
  return children;
}
