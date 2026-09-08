"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Bell, CircleUser, LogOut, WalletCards } from "lucide-react";

import type { StaffShellUser } from "@/app/(main)/dashboard/_components/sidebar/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

interface AccountSwitcherProps {
  user: StaffShellUser;
  canViewNotifications: boolean;
  canViewPayouts: boolean;
}

export function AccountSwitcher({ user, canViewNotifications, canViewPayouts }: AccountSwitcherProps) {
  const router = useRouter();
  const basePath = `/dashboard/${user.role}`;
  const roleLabel = user.role === "internal" ? "Internal staff" : "External staff";

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Open account menu for ${user.name}`}>
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={user.avatar || undefined} alt={user.name} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-64 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2 py-1">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={user.avatar || undefined} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-muted-foreground text-xs">
                {roleLabel}
                {user.resortName ? ` · ${user.resortName}` : ""}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`${basePath}/settings`}>
              <CircleUser />
              Account settings
            </Link>
          </DropdownMenuItem>
          {canViewPayouts ? (
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/payout`}>
                <WalletCards />
                Payouts
              </Link>
            </DropdownMenuItem>
          ) : null}
          {canViewNotifications ? (
            <DropdownMenuItem asChild>
              <Link href={`${basePath}/notifications`}>
                <Bell />
                Notifications
              </Link>
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void logout()}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
