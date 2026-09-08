"use client";

import type { ReactTable } from "@tanstack/react-table";
import { Users as UsersIcon } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import type { UserRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";
import { UserActions, type UserResortOption } from "./user-actions";
import { UsersPagination } from "./users-pagination";

const presenceDot: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-muted-foreground",
};

function formatUserDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function UsersGrid({
  table,
  resorts,
}: {
  table: ReactTable<DataTableFeatures, UserRow>;
  resorts: UserResortOption[];
}) {
  const rows = table.getRowModel().rows;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {rows.length ? (
        <div className="grid gap-4 px-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const user = row.original;
            return (
              <Card key={row.id} size="sm" className="h-full">
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar size="lg" className="font-medium">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      {user.presence ? (
                        <AvatarBadge className={presenceDot[user.presence] ?? "bg-muted-foreground"} />
                      ) : null}
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{user.name}</CardTitle>
                      <CardDescription className="truncate">{user.email}</CardDescription>
                    </div>
                  </div>
                  <CardAction>
                    <UserActions user={user} resorts={resorts} />
                  </CardAction>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{titleCase(user.role)}</Badge>
                    <Badge variant={user.status === "active" ? "default" : "secondary"}>
                      {titleCase(user.status)}
                    </Badge>
                    {user.presence ? <Badge variant="outline">{titleCase(user.presence)}</Badge> : null}
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Resort</dt>
                      <dd className="truncate font-medium">{user.resort_name ?? "Unassigned"}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Phone</dt>
                      <dd className="truncate font-medium">{user.phone ?? "Not provided"}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Bookings</dt>
                      <dd className="truncate font-medium tabular-nums">{user.total_booking}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Presence</dt>
                      <dd className="truncate font-medium">
                        {user.presence ? titleCase(user.presence) : "Not tracked"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>

                <CardFooter className="justify-end">
                  <span className="text-muted-foreground text-xs">Joined {formatUserDate(user.created_at)}</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className="mx-4 min-h-64 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon />
            </EmptyMedia>
            <EmptyTitle>No users found</EmptyTitle>
            <EmptyDescription>Try changing the search query or one of the active filters.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <UsersPagination table={table} />
    </div>
  );
}
