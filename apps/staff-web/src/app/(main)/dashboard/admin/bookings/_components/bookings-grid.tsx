"use client";

import type { ReactTable } from "@tanstack/react-table";
import { CalendarDays } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import type { BookingOptions, BookingRow } from "../../_lib/admin-data";
import { formatUsd, titleCase } from "../../_lib/format";
import { BookingActions } from "./booking-actions";

function formatBookingDate(value: string) {
  const normalized = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
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

export function BookingsGrid({
  table,
  options,
}: {
  table: ReactTable<DataTableFeatures, BookingRow>;
  options: BookingOptions;
}) {
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return (
      <Empty className="mx-4 min-h-64 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays />
          </EmptyMedia>
          <EmptyTitle>No bookings found</EmptyTitle>
          <EmptyDescription>Try changing the search query or one of the active filters.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 px-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const booking = row.original;
        const guestCount = Number(booking.adult_count) + Number(booking.child_count);

        return (
          <Card key={row.id} size="sm" className="h-full">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar size="lg" className="font-medium">
                  <AvatarFallback>{getInitials(booking.guest_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate">{booking.guest_name}</CardTitle>
                  <p className="truncate font-mono text-muted-foreground text-xs">{booking.booking_code}</p>
                </div>
              </div>
              <CardAction>
                <BookingActions booking={booking} options={options} />
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(booking.status)}>{titleCase(booking.status)}</Badge>
                {booking.staff_role ? <Badge variant="outline">{titleCase(booking.staff_role)}</Badge> : null}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="col-span-2 flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Schedule</dt>
                  <dd className="truncate font-medium">
                    {formatBookingDate(booking.event_date)} · {formatTime(booking.time_start)}–
                    {formatTime(booking.time_end)}
                  </dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Package</dt>
                  <dd className="truncate font-medium">{booking.package_name}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Staff</dt>
                  <dd className="truncate font-medium">{booking.staff_name}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Resort</dt>
                  <dd className="truncate font-medium">{booking.resort_name ?? "Unassigned"}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Guests</dt>
                  <dd className="font-medium tabular-nums">{guestCount} guests</dd>
                </div>
              </dl>
            </CardContent>

            <CardFooter className="justify-between gap-3">
              <span className="text-muted-foreground text-xs">Invoice</span>
              <span className="font-medium tabular-nums">{formatUsd(booking.invoice_total_usd)}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
