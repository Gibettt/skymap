import "server-only";

import { redirect } from "next/navigation";

import { currentUser, getUserPermissions } from "@ephemeris/auth";

export type StaffRole = "internal" | "external";

export async function requireStaffContext(expectedRole?: string, permission?: string) {
  const user = await currentUser();
  if (!user || (user.role !== "internal" && user.role !== "external")) {
    redirect("/login");
  }

  const staffUser = user as typeof user & { role: StaffRole };

  if (expectedRole && staffUser.role !== expectedRole) {
    redirect(`/dashboard/${staffUser.role}`);
  }

  const permissions = await getUserPermissions(staffUser);
  if (permission && !permissions.includes(permission)) {
    redirect(`/dashboard/${staffUser.role}`);
  }

  return {
    user: staffUser,
    role: staffUser.role,
    permissions,
    readOnly: staffUser.access_role_level === "read_only",
  };
}
