"use client";

import type { ReactTable } from "@tanstack/react-table";
import { Building2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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

export function ResortsGrid({ table }: { table: ReactTable<DataTableFeatures, ResortRow> }) {
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return (
      <Empty className="mx-4 min-h-64 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>No resorts found</EmptyTitle>
          <EmptyDescription>Try changing the search query or one of the active filters.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 px-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const resort = row.original;
        return (
          <Card key={row.id} size="sm" className="h-full">
            <CardHeader>
              <div className="flex min-w-0 items-center gap-3">
                <Avatar size="lg" className="font-medium">
                  <AvatarFallback>{getInitials(resort.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <CardTitle className="truncate">{resort.name}</CardTitle>
                  <CardDescription className="truncate font-mono">{resort.code}</CardDescription>
                </div>
              </div>
              <CardAction>
                <ResortActions resort={resort} />
              </CardAction>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant(resort.status)}>{titleCase(resort.status)}</Badge>
                <Badge variant={statusVariant(resort.coverage_status)}>{titleCase(resort.coverage_status)}</Badge>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div className="col-span-2 flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Location</dt>
                  <dd className="truncate font-medium">{resort.location}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Internal staff</dt>
                  <dd className="font-medium tabular-nums">{resort.active_internal_count}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">External staff</dt>
                  <dd className="font-medium tabular-nums">{resort.active_external_count}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Total bookings</dt>
                  <dd className="font-medium tabular-nums">{resort.total_bookings_count}</dd>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-muted-foreground text-xs">Open bookings</dt>
                  <dd className="font-medium tabular-nums">{resort.open_bookings_count}</dd>
                </div>
              </dl>
            </CardContent>

            <CardFooter className="justify-between gap-3 text-muted-foreground text-xs">
              <span className="truncate">{resort.timezone}</span>
              <span>{resort.observation_spots ? "Observation ready" : "No observation spots"}</span>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
