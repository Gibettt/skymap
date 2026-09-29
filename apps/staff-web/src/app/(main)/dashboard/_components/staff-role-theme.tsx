"use client";

import { useLayoutEffect } from "react";

import type { StaffRole } from "@/navigation/sidebar/sidebar-items";

export function StaffRoleTheme({ role }: { role: StaffRole }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousRole = root.dataset.staffPortalRole;
    root.dataset.staffPortalRole = role;

    return () => {
      if (previousRole) root.dataset.staffPortalRole = previousRole;
      else delete root.dataset.staffPortalRole;
    };
  }, [role]);

  return null;
}
