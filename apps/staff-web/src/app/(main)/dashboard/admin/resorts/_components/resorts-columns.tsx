"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import type { ResortRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";
import { ResortActions } from "./resort-actions";

function statusVariant(value: string): "default" | "destructive" | "outline" | "secondary" {
  if (value === "active" || value === "ready") return "default";
  if (value === "needs_both") return "destructive";
  if (value.startsWith("needs_")) return "secondary";
  return "outline";
}

function ResortBadge({ value }: { value: string }) {
  return (
    <Badge className="gap-1.5 border px-2 py-1 font-medium" variant={statusVariant(value)}>
      <span className="size-1.5 rounded-full bg-current" />
      {titleCase(value)}
    </Badge>
  );
}

export const resortsColumns: ColumnDef<DataTableFeatures, ResortRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Subscribe
          source={table.atoms.rowSelection}
          selector={() =>
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() && "indeterminate")
          }
        >
          {(checked) => (
            <Checkbox
              aria-label="Select all resorts"
              checked={checked}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            />
          )}
        </Subscribe>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => Boolean(selection?.[row.id])}>
          {(checked) => (
            <Checkbox
              aria-label={`Select ${row.original.name}`}
              checked={checked}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
            />
          )}
        </Subscribe>
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "search",
    accessorFn: (row) => `${row.name} ${row.code} ${row.location}`,
    filterFn: "includesString",
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "resort",
    accessorFn: (row) => row.name,
    header: "Resort",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar size="lg" className="font-medium">
          <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground text-sm">{row.original.name}</div>
          <div className="truncate font-mono text-muted-foreground text-xs">{row.original.code}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="max-w-52 truncate">{row.original.location}</div>,
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => <ResortBadge value={row.original.status} />,
  },
  {
    accessorKey: "coverage_status",
    header: "Coverage",
    filterFn: "equalsString",
    cell: ({ row }) => <ResortBadge value={row.original.coverage_status} />,
  },
  {
    id: "staff",
    accessorFn: (row) => Number(row.active_internal_count) + Number(row.active_external_count),
    header: "Active Staff",
    cell: ({ row }) => (
      <div className="grid gap-0.5 whitespace-nowrap text-sm tabular-nums">
        <span>{row.original.active_internal_count} internal</span>
        <span className="text-muted-foreground text-xs">{row.original.active_external_count} external</span>
      </div>
    ),
  },
  {
    id: "bookings",
    accessorFn: (row) => Number(row.total_bookings_count),
    header: "Bookings",
    cell: ({ row }) => (
      <div className="grid gap-0.5 whitespace-nowrap text-sm tabular-nums">
        <span>{row.original.total_bookings_count} total</span>
        <span className="text-muted-foreground text-xs">{row.original.open_bookings_count} open</span>
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ResortActions resort={row.original} />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
];
