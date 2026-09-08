"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Subscribe } from "@tanstack/react-table";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import type { BookingOptions, BookingRow } from "../../_lib/admin-data";
import { formatUsd, titleCase } from "../../_lib/format";
import { BookingActions } from "./booking-actions";

function formatBookingDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "-";
}

function statusVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
  if (status.startsWith("cancelled") || status === "rejected") return "destructive";
  if (status === "pending") return "outline";
  if (status === "rescheduled") return "secondary";
  return "default";
}

function BookingBadge({ status }: { status: string }) {
  return (
    <Badge className="gap-1.5 border px-2 py-1 font-medium" variant={statusVariant(status)}>
      <span className="size-1.5 rounded-full bg-current" />
      {titleCase(status)}
    </Badge>
  );
}

export function createBookingsColumns(options: BookingOptions): ColumnDef<DataTableFeatures, BookingRow>[] {
  return [
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
              aria-label="Select all bookings"
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
              aria-label={`Select ${row.original.booking_code}`}
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
    accessorFn: (row) =>
      `${row.booking_code} ${row.guest_name} ${row.package_name} ${row.staff_name} ${row.resort_name ?? ""}`,
    filterFn: "includesString",
    enableHiding: false,
    enableSorting: false,
  },
  {
    id: "guest",
    accessorFn: (row) => row.guest_name,
    header: "Booking",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar size="lg" className="font-medium">
          <AvatarFallback>{getInitials(row.original.guest_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground text-sm">{row.original.guest_name}</div>
          <div className="truncate font-mono text-muted-foreground text-xs">{row.original.booking_code}</div>
        </div>
      </div>
    ),
  },
  {
    id: "eventDate",
    accessorFn: (row) => new Date(row.event_date).getTime(),
    header: "Schedule",
    cell: ({ row }) => (
      <div className="grid gap-0.5 whitespace-nowrap">
        <span>{formatBookingDate(row.original.event_date)}</span>
        <span className="text-muted-foreground text-xs">
          {formatTime(row.original.time_start)} - {formatTime(row.original.time_end)}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "package_name",
    header: "Package",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="max-w-48 truncate">{row.original.package_name}</div>,
  },
  {
    accessorKey: "staff_name",
    header: "Staff",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="max-w-40 truncate">{row.original.staff_name}</div>,
  },
  {
    id: "resort",
    accessorFn: (row) => row.resort_name ?? "Unassigned",
    header: "Resort",
    filterFn: "equalsString",
    cell: ({ row }) => <div className="max-w-40 truncate">{row.original.resort_name ?? "Unassigned"}</div>,
  },
  {
    id: "guests",
    accessorFn: (row) => Number(row.adult_count) + Number(row.child_count),
    header: "Guests",
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-sm tabular-nums">
        {Number(row.original.adult_count) + Number(row.original.child_count)} guests
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    filterFn: "equalsString",
    cell: ({ row }) => <BookingBadge status={row.original.status} />,
  },
  {
    id: "invoice",
    accessorFn: (row) => Number(row.invoice_total_usd),
    header: () => <div className="text-right">Invoice</div>,
    cell: ({ row }) => (
      <div className="whitespace-nowrap text-right font-medium tabular-nums">
        {formatUsd(row.original.invoice_total_usd)}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <BookingActions booking={row.original} options={options} />
      </div>
    ),
    enableHiding: false,
    enableSorting: false,
  },
  ];
}
