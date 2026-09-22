import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { currentUser } from "@ephemeris/auth";

export default async function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await currentUser();
  if (user?.role !== "admin") {
    redirect("/login");
  }

  return (
    <div data-admin-portal className="min-w-0">
      {children}
    </div>
  );
}
