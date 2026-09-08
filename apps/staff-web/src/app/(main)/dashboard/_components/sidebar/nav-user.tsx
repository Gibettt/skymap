"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Bell, CircleUser, EllipsisVertical, LogOut, WalletCards } from "lucide-react";

import type { StaffShellUser } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { getInitials } from "@/lib/utils";

interface NavUserProps {
  user: StaffShellUser;
  canViewNotifications: boolean;
  canViewPayouts: boolean;
}

export function NavUser({ user, canViewNotifications, canViewPayouts }: NavUserProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();
  const basePath = `/dashboard/${user.role}`;
  const roleLabel = user.role === "internal" ? "Internal staff" : "External staff";

  async function logout() {
    if (isMobile) setOpenMobile(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function closeMobileSidebar() {
    if (isMobile) setOpenMobile(false);
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg grayscale">
                <AvatarImage src={user.avatar || undefined} alt={user.name} />
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-muted-foreground text-xs">{roleLabel}</span>
              </div>
              <EllipsisVertical className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-muted-foreground text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={`${basePath}/settings`} onClick={closeMobileSidebar}>
                  <CircleUser />
                  Account settings
                </Link>
              </DropdownMenuItem>
              {canViewPayouts ? (
                <DropdownMenuItem asChild>
                  <Link href={`${basePath}/payout`} onClick={closeMobileSidebar}>
                    <WalletCards />
                    Payouts
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {canViewNotifications ? (
                <DropdownMenuItem asChild>
                  <Link href={`${basePath}/notifications`} onClick={closeMobileSidebar}>
                    <Bell />
                    Notifications
                  </Link>
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={logout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
