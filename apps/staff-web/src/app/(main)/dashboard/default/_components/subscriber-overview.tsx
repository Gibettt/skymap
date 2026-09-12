"use client";

import Link from "next/link";
import { Download, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { RecentCustomerRow } from "./recent-customers-table/schema";
import { RecentCustomersTable } from "./recent-customers-table/table";

function csvCell(value: string) {
  const spreadsheetSafeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${spreadsheetSafeValue.replaceAll('"', '""')}"`;
}

export function SubscriberOverview({
  data,
  total,
  exportFilename = "ephemeris-bookings.csv",
  newBookingHref,
}: {
  data: RecentCustomerRow[];
  total: number;
  exportFilename?: string;
  newBookingHref?: string;
}) {
  function exportBookings() {
    const rows = [
      ["Guest", "Booking code", "Package", "Status", "Payment", "Event date"],
      ...data.map((booking) => [
        booking.name,
        booking.email,
        booking.plan,
        booking.status,
        booking.billing,
        booking.joined,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => csvCell(String(cell))).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">{total.toLocaleString("en-US")} Bookings</CardTitle>
        <CardDescription>Recent booking records with package, payment, status, and event activity.</CardDescription>
        <CardAction className="flex items-center gap-2">
          {newBookingHref ? (
            <Button size="sm" asChild>
              <Link href={newBookingHref}>
                <Plus data-icon="inline-start" />
                New booking
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={exportBookings} disabled={data.length === 0}>
            <Download />
            Export
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="pt-0">
        <RecentCustomersTable data={data} />
      </CardContent>
    </Card>
  );
}
