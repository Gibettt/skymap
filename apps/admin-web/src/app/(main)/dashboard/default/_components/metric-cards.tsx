import { DollarSign, TrendingDown, TrendingUp, UserPlus, Users, Waves } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { OverviewMetrics } from "../_lib/overview-data";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number, withSign = true) {
  const rounded = Math.round(value * 10) / 10;
  return `${withSign && rounded > 0 ? "+" : ""}${rounded}%`;
}

export function MetricCards({ metrics }: { metrics: OverviewMetrics }) {
  const revenueIsDown = metrics.revenueChange < 0;
  const bookingsAreDown = metrics.bookingChange < 0;

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <DollarSign className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Total Revenue</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {formatUsd(metrics.totalRevenue)}
            </div>
            <Badge variant={revenueIsDown ? "destructive" : "default"}>
              {revenueIsDown ? <TrendingDown /> : <TrendingUp />}
              {formatPercent(metrics.revenueChange)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Revenue from completed bookings</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <UserPlus className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>New Bookings</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {metrics.newBookings.toLocaleString("en-US")}
            </div>
            <Badge variant={bookingsAreDown ? "destructive" : "default"}>
              {bookingsAreDown ? <TrendingDown /> : <TrendingUp />}
              {formatPercent(metrics.bookingChange)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Bookings created in the last 30 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Users className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Active Accounts</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {metrics.activeAccounts.toLocaleString("en-US")}
            </div>
            <Badge>
              <TrendingUp />
              {formatPercent(metrics.activeAccountRate, false)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Share of accounts currently active</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Waves className="size-4" />
            </div>
          </CardTitle>
          <CardDescription>Completion Rate</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium text-3xl tabular-nums leading-none tracking-tight">
              {formatPercent(metrics.completionRate, false)}
            </div>
            <Badge>
              <TrendingUp />
              {metrics.completedBookings}/{metrics.totalBookings}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Completed experiences across all bookings</p>
        </CardContent>
      </Card>
    </div>
  );
}
