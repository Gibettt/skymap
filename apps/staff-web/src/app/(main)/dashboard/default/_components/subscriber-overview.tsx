"use client";

import Link from "next/link";
import { downloadExcelReport } from "@ephemeris/export";
import { Download, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { RecentCustomerRow } from "./recent-customers-table/schema";
import { RecentCustomersTable } from "./recent-customers-table/table";

export function SubscriberOverview({
  data,
  total,
  exportFilename = "ephemeris-bookings.xlsx",
  newBookingHref,
}: {
  data: RecentCustomerRow[];
  total: number;
  exportFilename?: string;
  newBookingHref?: string;
}) {
  async function exportBookings() {
    await downloadExcelReport({
      title: "SpaceCat ASTROTOURISM — Recent Bookings",
      subtitle: "Booking records shown on the overview",
      filename: exportFilename,
      sheetName: "Recent Bookings",
      columns: [
        { key: "guest", header: "Guest", width: 24 },
        { key: "bookingCode", header: "Booking code", width: 24 },
        { key: "package", header: "Package", width: 28 },
        { key: "status", header: "Status", width: 16, kind: "status" },
        { key: "payment", header: "Payment", width: 16, kind: "status" },
        { key: "eventDate", header: "Event date", width: 20, kind: "datetime" },
      ],
      rows: data.map((booking) => ({
        guest: booking.name,
        bookingCode: booking.email,
        package: booking.plan,
        status: booking.status,
        payment: booking.billing,
        eventDate: booking.joined,
      })),
    });
  }

  return (
    <Card>
      <CardHeader className="has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="leading-none">{total.toLocaleString("en-US")} Bookings</CardTitle>
        <CardDescription>Recent booking records with package, payment, status, and event activity.</CardDescription>
        <CardAction className="col-start-1 row-start-auto mt-1 grid w-full grid-cols-2 gap-2 justify-self-stretch sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0 sm:flex sm:w-auto sm:justify-self-end">
          {newBookingHref ? (
            <Button className="w-full sm:w-auto" size="sm" asChild>
              <Link href={newBookingHref}>
                <Plus data-icon="inline-start" />
                New booking
              </Link>
            </Button>
          ) : null}
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            size="sm"
            onClick={exportBookings}
            disabled={data.length === 0}
          >
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
