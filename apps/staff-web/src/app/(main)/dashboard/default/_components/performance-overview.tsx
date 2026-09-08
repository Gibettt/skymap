"use client";

import Link from "next/link";

import { format, parseISO } from "date-fns";
import { Area, CartesianGrid, ComposedChart, Line, XAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { BookingActivityPoint } from "../_lib/overview-data";

const chartConfig = {
  totalBookings: {
    label: "Total Bookings",
    color: "var(--chart-1)",
  },
  openBookings: {
    label: "Open Bookings",
    color: "var(--chart-2)",
  },
  completedBookings: {
    label: "Completed Bookings",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

export function PerformanceOverview({ data, reportHref }: { data: BookingActivityPoint[]; reportHref?: string }) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Booking Activity</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">Booking activity for the last 3 months</span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          <Select defaultValue="quarter">
            <SelectTrigger size="sm" className="w-28">
              <SelectValue placeholder="3 months" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Period</SelectLabel>
                <SelectItem value="quarter">3 months</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select defaultValue="all">
            <SelectTrigger size="sm" className="w-32">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {reportHref ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={reportHref}>View report</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm">
              View report
            </Button>
          )}
        </CardAction>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
          <ComposedChart data={data} margin={{ top: 0 }}>
            <defs>
              <linearGradient id="fillTotalBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-totalBookings)" stopOpacity={0.36} />
                <stop offset="95%" stopColor="var(--color-totalBookings)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={48}
              tickFormatter={(value) =>
                parseISO(value).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />

            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="w-50"
                  indicator="line"
                  labelFormatter={(value) => format(parseISO(String(value)), "d MMMM yyyy")}
                />
              }
            />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-5 justify-end" />} />

            <Area
              dataKey="totalBookings"
              type="natural"
              fill="url(#fillTotalBookings)"
              stroke="var(--color-totalBookings)"
              strokeWidth={1.25}
              dot={false}
              fillOpacity={1}
            />
            <Line
              dataKey="openBookings"
              type="natural"
              stroke="var(--color-openBookings)"
              strokeWidth={1.4}
              dot={false}
            />
            <Line
              dataKey="completedBookings"
              type="natural"
              stroke="var(--color-completedBookings)"
              strokeWidth={1.2}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
