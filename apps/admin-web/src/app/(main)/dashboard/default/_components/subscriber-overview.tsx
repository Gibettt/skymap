"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { RecentCustomerRow } from "./recent-customers-table/schema";
import { RecentCustomersTable } from "./recent-customers-table/table";

export function SubscriberOverview({ data, total }: { data: RecentCustomerRow[]; total: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-none">{total.toLocaleString("en-US")} Bookings</CardTitle>
        <CardDescription>Recent booking records with package, payment, status, and event activity.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">
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
