import type { ReactNode } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { currentUser, getUserPermissions } from "@ephemeris/auth";

import { AppSidebar, type StaffShellUser } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { getStaffSidebarItems, type StaffAccessLevel, type StaffRole } from "@/navigation/sidebar/sidebar-items";
import { getPreference } from "@/server/server-actions";

import { AccountSwitcher } from "./_components/header/account-switcher";
import { LayoutControls } from "./_components/header/layout-controls";
import { NotificationCenter } from "./_components/header/notification-center";
import { SearchDialog } from "./_components/header/search-dialog";
import { ThemeSwitcher } from "./_components/header/theme-switcher";
import { StaffPresence } from "./_components/staff-presence";

function isStaffRole(role: string): role is StaffRole {
  return role === "internal" || role === "external";
}

function staffAccessLevel(value: string | null | undefined): StaffAccessLevel {
  if (value === "full" || value === "read_only") return value;
  return "scoped";
}

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const sessionUser = await currentUser();

  if (!sessionUser) redirect("/login");
  if (!isStaffRole(sessionUser.role)) redirect("/unauthorized");

  const permissions = await getUserPermissions(sessionUser);
  const accessLevel = staffAccessLevel(sessionUser.access_role_level);
  const navigationItems = getStaffSidebarItems({ role: sessionUser.role, permissions, accessLevel });
  const canViewNotifications = permissions.includes("staff.notifications");
  const canViewPayouts = permissions.includes("staff.finance");
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const [variant, collapsible] = await Promise.all([
    getPreference("sidebar_variant"),
    getPreference("sidebar_collapsible"),
  ]);
  const shellUser: StaffShellUser = {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    avatar: "",
    role: sessionUser.role,
    resortName: sessionUser.resort_name ?? null,
    accessRoleName: sessionUser.access_role_name ?? null,
  };

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
        } as React.CSSProperties
      }
    >
      <StaffPresence />
      <AppSidebar
        variant={variant}
        collapsible={collapsible}
        user={shellUser}
        items={navigationItems}
        canViewNotifications={canViewNotifications}
        canViewPayouts={canViewPayouts}
      />
      <SidebarInset
        className={cn(
          "[html[data-content-layout=centered]_&>*]:mx-auto",
          "[html[data-content-layout=centered]_&>*]:w-full",
          "[html[data-content-layout=centered]_&>*]:max-w-screen-2xl",
          "peer-data-[variant=inset]:border",
          "[--dashboard-header-height:--spacing(12)]",
          "min-w-0 overflow-x-clip",
        )}
      >
        <header
          className={cn(
            "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
            "[html[data-navbar-style=sticky]_&]:sticky [html[data-navbar-style=sticky]_&]:top-0 [html[data-navbar-style=sticky]_&]:z-50 [html[data-navbar-style=sticky]_&]:overflow-hidden [html[data-navbar-style=sticky]_&]:rounded-t-[inherit] [html[data-navbar-style=sticky]_&]:bg-background/50 [html[data-navbar-style=sticky]_&]:backdrop-blur-md",
          )}
        >
          <div className="flex w-full min-w-0 items-center justify-between gap-2 px-2 sm:px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-1 lg:gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mx-2 hidden data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center sm:block"
              />
              <SearchDialog items={navigationItems} />
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <div className="hidden sm:block">
                <LayoutControls />
              </div>
              <ThemeSwitcher />
              {canViewNotifications ? (
                <NotificationCenter role={sessionUser.role} readOnly={accessLevel === "read_only"} />
              ) : null}
              <AccountSwitcher
                user={shellUser}
                canViewNotifications={canViewNotifications}
                canViewPayouts={canViewPayouts}
              />
            </div>
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden p-2 has-data-[content-padding=false]:p-0 sm:p-4 md:p-6 md:has-data-[content-padding=false]:p-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
