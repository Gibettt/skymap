"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Bot } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import type { AuditLogRow } from "../../_lib/admin-data";
import { LogActions } from "./log-actions";
import { formatLogAction, formatLogDateTime, formatLogEntity, getLogActionVariant } from "./log-format";

export const logsColumns: ColumnDef<DataTableFeatures, AuditLogRow>[] = [
  {
    id: "search",
    accessorFn: (row) =>
      [
        row.id,
        row.actor_name,
        row.actor_email,
        row.action,
        row.entity_type,
        row.entity_id,
        row.ip_address,
        row.user_agent,
      ]
        .filter(Boolean)
        .join(" "),
    filterFn: "includesString",
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "event_time",
    accessorFn: (row) => new Date(row.created_at).getTime(),
    header: "Time",
    cell: ({ row }) => (
      <div className="grid gap-0.5 whitespace-nowrap">
        <span className="font-medium text-sm">{formatLogDateTime(row.original.created_at)}</span>
        <span className="font-mono text-muted-foreground text-xs">#{row.original.id}</span>
      </div>
    ),
  },
  {
    id: "actor",
    accessorFn: (row) => row.actor_name ?? "System",
    header: "Actor",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar size="lg" className="font-medium">
          <AvatarFallback>
            {row.original.actor_name ? getInitials(row.original.actor_name) : <Bot />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="max-w-48 truncate font-medium text-foreground text-sm">
            {row.original.actor_name ?? "System"}
          </div>
          <div className="max-w-48 truncate text-muted-foreground text-sm">
            {row.original.actor_email ?? "Automated event"}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "action",
    header: "Action",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge variant={getLogActionVariant(row.original.action)}>{formatLogAction(row.original.action)}</Badge>
    ),
  },
  {
    accessorKey: "entity_type",
    header: "Entity",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <div className="grid max-w-52 gap-0.5">
        <span className="truncate text-sm">{formatLogEntity(row.original.entity_type)}</span>
        <span className="truncate font-mono text-muted-foreground text-xs">{row.original.entity_id ?? "-"}</span>
      </div>
    ),
  },
  {
    accessorKey: "ip_address",
    header: "IP Address",
    cell: ({ row }) => <div className="font-mono text-xs">{row.original.ip_address ?? "-"}</div>,
  },
  {
    accessorKey: "user_agent",
    header: "User Agent",
    cell: ({ row }) => (
      <div className="max-w-64 truncate text-muted-foreground text-xs">{row.original.user_agent ?? "Not recorded"}</div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <LogActions log={row.original} />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
];
