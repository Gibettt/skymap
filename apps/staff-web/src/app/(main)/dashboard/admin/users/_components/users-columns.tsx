"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { cn, getInitials } from "@/lib/utils";

import type { UserRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";
import { UserActions, type UserResortOption } from "./user-actions";

const presenceDot: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-muted-foreground",
};

function formatUserDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function UserAvatar({ user }: { user: UserRow }) {
  return (
    <Avatar size="lg" className="font-medium">
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      {user.presence ? <AvatarBadge className={presenceDot[user.presence] ?? "bg-muted-foreground"} /> : null}
    </Avatar>
  );
}

function AccountStatusBadge({ status }: { status: string }) {
  const active = status === "active";
  return (
    <Badge className="gap-1.5 border px-2 py-1 font-medium" variant={active ? "default" : "secondary"}>
      <span className="size-1.5 rounded-full bg-current" />
      {titleCase(status)}
    </Badge>
  );
}

function PresenceBadge({ presence }: { presence: string | null }) {
  if (!presence) return <span className="text-muted-foreground text-sm">Not tracked</span>;
  return (
    <Badge variant="outline" className="gap-1.5 px-2 py-1 font-medium">
      <span className={cn("size-1.5 rounded-full", presenceDot[presence] ?? "bg-muted-foreground")} />
      {titleCase(presence)}
    </Badge>
  );
}

export function getUsersColumns(resorts: UserResortOption[]): ColumnDef<DataTableFeatures, UserRow>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        [row.name, row.email, row.phone, row.role, row.resort_name, row.status, row.presence]
          .filter(Boolean)
          .join(" "),
      filterFn: "includesString",
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "user",
      accessorFn: (row) => row.name,
      header: "User",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar user={row.original} />
          <div className="min-w-0">
            <div className="max-w-56 truncate font-medium text-foreground text-sm">{row.original.name}</div>
            <div className="max-w-56 truncate text-muted-foreground text-sm">{row.original.email}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      filterFn: "equalsString",
      cell: ({ row }) => <div className="whitespace-nowrap">{titleCase(row.original.role)}</div>,
    },
    {
      id: "resort_name",
      accessorFn: (row) => row.resort_name ?? "Unassigned",
      header: "Resort",
      filterFn: "equalsString",
      cell: ({ row }) => <div className="max-w-44 truncate">{row.original.resort_name ?? "Unassigned"}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: "equalsString",
      cell: ({ row }) => <AccountStatusBadge status={row.original.status} />,
    },
    {
      id: "presence",
      accessorFn: (row) => row.presence ?? "not tracked",
      header: "Presence",
      filterFn: "equalsString",
      cell: ({ row }) => <PresenceBadge presence={row.original.presence} />,
    },
    {
      accessorKey: "total_booking",
      header: "Bookings",
      cell: ({ row }) => <div className="text-sm tabular-nums">{row.original.total_booking}</div>,
    },
    {
      id: "joined_at",
      accessorFn: (row) => new Date(row.created_at).getTime(),
      header: "Joined",
      cell: ({ row }) => <div className="whitespace-nowrap text-sm">{formatUserDate(row.original.created_at)}</div>,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <UserActions user={row.original} resorts={resorts} />
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
  ];
}
