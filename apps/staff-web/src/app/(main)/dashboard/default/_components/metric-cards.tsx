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

type MetricCardsProps = {
  metrics: OverviewMetrics;
  variant?: "admin" | "staff";
  canViewFinance?: boolean;
  indicatorTone?: "default" | "purple";
};

export function MetricCards({
  metrics,
  variant = "admin",
  canViewFinance = true,
  indicatorTone = "default",
}: MetricCardsProps) {
  const revenueIsDown = metrics.revenueChange < 0;
  const bookingsAreDown = metrics.bookingChange < 0;
  const isStaff = variant === "staff";
  const indicatorClass =
    indicatorTone === "purple"
      ? "bg-primary text-primary-foreground [a]:hover:bg-primary/80 dark:bg-violet-500 dark:text-white dark:[a]:hover:bg-violet-500/90"
      : undefined;
  let primaryDescription = "Revenue from completed bookings";

  if (isStaff) {
    primaryDescription = canViewFinance
      ? "Your personal commission from eligible completed bookings"
      : "Finance access is not enabled for this role";
  }

  return (
    <div className="grid min-w-0 grid-cols-2 gap-2 *:data-[slot=card]:min-w-0 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs sm:gap-4 xl:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <DollarSign className="size-4" />
            </div>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {isStaff ? "Earned Commission" : "Total Revenue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="font-medium text-xl tabular-nums leading-none tracking-tight sm:text-2xl lg:text-3xl">
              {formatUsd(metrics.totalRevenue)}
            </div>
            <Badge
              className={revenueIsDown ? undefined : indicatorClass}
              variant={revenueIsDown ? "destructive" : "default"}
            >
              {revenueIsDown ? <TrendingDown /> : <TrendingUp />}
              {formatPercent(metrics.revenueChange)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-snug sm:text-sm">{primaryDescription}</p>
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <UserPlus className="size-4" />
            </div>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">New Bookings</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="font-medium text-xl tabular-nums leading-none tracking-tight sm:text-2xl lg:text-3xl">
              {metrics.newBookings.toLocaleString("en-US")}
            </div>
            <Badge
              className={bookingsAreDown ? undefined : indicatorClass}
              variant={bookingsAreDown ? "destructive" : "default"}
            >
              {bookingsAreDown ? <TrendingDown /> : <TrendingUp />}
              {formatPercent(metrics.bookingChange)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-snug sm:text-sm">Bookings created in the last 30 days</p>
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Users className="size-4" />
            </div>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {isStaff ? "Open Bookings" : "Active Accounts"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="font-medium text-xl tabular-nums leading-none tracking-tight sm:text-2xl lg:text-3xl">
              {metrics.activeAccounts.toLocaleString("en-US")}
            </div>
            <Badge className={indicatorClass}>
              <TrendingUp />
              {formatPercent(metrics.activeAccountRate, false)}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-snug sm:text-sm">
            {isStaff ? "Pending, active, and rescheduled bookings in your scope" : "Share of accounts currently active"}
          </p>
        </CardContent>
      </Card>

      <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]">
        <CardHeader>
          <CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
              <Waves className="size-4" />
            </div>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Completion Rate</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="font-medium text-xl tabular-nums leading-none tracking-tight sm:text-2xl lg:text-3xl">
              {formatPercent(metrics.completionRate, false)}
            </div>
            <Badge className={indicatorClass}>
              <TrendingUp />
              {metrics.completedBookings}/{metrics.totalBookings}
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-snug sm:text-sm">
            {isStaff ? "Completed experiences in your booking scope" : "Completed experiences across all bookings"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
