"use client";

import Link from "next/link";

import { Orbit } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import type { NavGroup, StaffRole } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

export interface StaffShellUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: StaffRole;
  resortName: string | null;
  accessRoleName: string | null;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: StaffShellUser;
  items: readonly NavGroup[];
  canViewNotifications: boolean;
  canViewPayouts: boolean;
}

export function AppSidebar({ user, items, canViewNotifications, canViewPayouts, ...props }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((state) => ({
      sidebarVariant: state.values.sidebar_variant,
      sidebarCollapsible: state.values.sidebar_collapsible,
      isSynced: state.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;
  const dashboardUrl = `/dashboard/${user.role}`;
  const closeMobileSidebar = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href={dashboardUrl} onClick={closeMobileSidebar}>
                <Orbit />
                <span className="font-semibold text-base">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} canViewNotifications={canViewNotifications} canViewPayouts={canViewPayouts} />
      </SidebarFooter>
    </Sidebar>
  );
}
