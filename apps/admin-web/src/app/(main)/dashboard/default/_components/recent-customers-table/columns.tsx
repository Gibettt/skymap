"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";
import { differenceInCalendarDays, endOfToday, format, parseISO } from "date-fns";
import { CircleAlertIcon, CircleCheckIcon, Clock3Icon, LoaderIcon, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { cn } from "@/lib/utils";

import type { RecentCustomerRow } from "./schema";

function statusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case "active":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
    case "completed":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "pending":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "rescheduled":
      return "border-violet-400/30 bg-violet-400/10 text-violet-200";
    case "cancelled":
    case "rejected":
      return "border-rose-400/30 bg-rose-400/10 text-rose-300";
    default:
      return "border-border text-muted-foreground";
  }
}

function billingBadgeClass(billing: string) {
  switch (billing?.toLowerCase()) {
    case "paid":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "pending":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "cancelled":
    case "overdue":
      return "border-rose-400/30 bg-rose-400/10 text-rose-300";
    default:
      return "border-border text-muted-foreground";
  }
}

function billingIcon(billing: string) {
  switch (billing) {
    case "Paid":
      return <CircleCheckIcon className="size-3.5 fill-emerald-500 stroke-background dark:fill-emerald-400" />;
    case "Pending":
      return <LoaderIcon className="size-3.5 animate-spin text-amber-300" />;
    case "Overdue":
      return <CircleAlertIcon className="size-3.5 text-rose-400" />;
    case "Trial":
      return <Clock3Icon className="size-3.5 text-muted-foreground" />;
    case "Cancelled":
      return <CircleAlertIcon className="size-3.5 text-rose-400" />;
    default:
      return null;
  }
}

export const recentCustomersColumns: ColumnDef<DataTableFeatures, RecentCustomerRow>[] = [
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
              checked={checked}
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all bookings on this page"
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
              checked={checked}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label={`Select ${row.original.name}`}
            />
          )}
        </Subscribe>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Guest",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
          <UserRound className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="grid min-w-0 gap-0.5">
            <span className="truncate font-medium text-sm text-foreground">{row.original.name}</span>
            <span className="truncate font-mono text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      </div>
    ),
    enableHiding: false,
  },
  {
    id: "search",
    accessorFn: (row) => `${row.id} ${row.name} ${row.email}`,
    filterFn: "includesString",
    enableHiding: true,
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge variant="outline" className={cn("gap-1 px-2 py-0.5 font-medium text-xs", statusBadgeClass(row.original.status))}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "billing",
    header: "Payment",
    filterFn: "equalsString",
    cell: ({ row }) => (
      <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 font-medium text-xs", billingBadgeClass(row.original.billing))}>
        {billingIcon(row.original.billing)}
        {row.original.billing}
      </Badge>
    ),
  },
  {
    accessorKey: "plan",
    header: "Package",
    cell: ({ row }) => <span className="font-medium text-sm text-foreground">{row.original.plan}</span>,
  },
  {
    id: "joinedWindow",
    accessorFn: (row) => {
      const daysSinceJoined = differenceInCalendarDays(endOfToday(), parseISO(row.joined));

      if (daysSinceJoined <= 30) return ["30", "90"];
      if (daysSinceJoined <= 90) return ["90"];
      return [];
    },
    filterFn: "arrIncludes",
    enableHiding: true,
  },
  {
    accessorKey: "joined",
    header: "Event date",
    cell: ({ row }) => {
      const eventAt = parseISO(row.original.joined);

      return (
        <div className="grid gap-0.5">
          <span className="font-medium text-sm text-foreground">{format(eventAt, "do MMMM yyyy")}</span>
          <span className="text-muted-foreground text-xs">at {format(eventAt, "h:mm a")}</span>
        </div>
      );
    },
  },
];
