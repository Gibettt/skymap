"use client";

import Link from "next/link";

import { Command } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { rootUser } from "@/data/users";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email: string;
    avatar: string;
  };
  permissions?: string[];
}

const adminPermissionByUrl: Record<string, string> = {
  "/dashboard/admin": "admin.overview",
  "/dashboard/admin/bookings": "admin.bookings",
  "/dashboard/admin/resorts": "admin.resorts",
  "/dashboard/admin/finance": "admin.finance",
  "/dashboard/admin/invoices": "admin.finance",
  "/dashboard/admin/packages": "admin.packages",
  "/dashboard/admin/users": "admin.users",
  "/dashboard/admin/roles": "admin.roles",
  "/dashboard/admin/logs": "admin.logs",
  "/dashboard/admin/calendar": "admin.calendar",
  "/dashboard/admin/notifications": "admin.notifications",
  "/dashboard/admin/pengaturan": "admin.settings",
};

export function AppSidebar({ user = rootUser, permissions, ...props }: AppSidebarProps) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;
  const visibleItems = permissions
    ? sidebarItems.map((group) =>
        group.label === "Ephemeris Admin"
          ? {
              ...group,
              items: group.items.filter((item) =>
                "url" in item ? permissions.includes(adminPermissionByUrl[item.url] ?? "") : true,
              ),
            }
          : group,
      )
    : sidebarItems;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/dashboard/default">
                <Command />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={visibleItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
