"use client";

import Image from "next/image";
import Link from "next/link";

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
      <SidebarHeader className="group-data-[collapsible=icon]:p-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip={APP_CONFIG.name}
              className="group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center"
            >
              <Link prefetch={false} href={dashboardUrl} onClick={closeMobileSidebar} className="flex items-center gap-2.5">
                <Image
                  src="/spacecat-astrotourism-logo.jpg"
                  alt="SpaceCat ASTROTOURISM"
                  width={36}
                  height={36}
                  priority
                  className="size-9 shrink-0 aspect-square rounded-lg object-cover"
                />
                <span className="font-semibold text-base truncate group-data-[collapsible=icon]:hidden">
                  {APP_CONFIG.name}
                </span>
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
