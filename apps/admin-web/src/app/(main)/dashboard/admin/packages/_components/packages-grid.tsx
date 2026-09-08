"use client";

import type { ReactTable } from "@tanstack/react-table";
import { PackageOpen } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import type { PackageRow } from "../../_lib/admin-data";
import { formatDate, formatUsd, titleCase } from "../../_lib/format";
import { PackageActions } from "./package-actions";
import type { PackageResortOption } from "./packages-columns";
import { PackagesPagination } from "./packages-pagination";

interface PackagesGridProps {
  table: ReactTable<DataTableFeatures, PackageRow>;
  resorts: PackageResortOption[];
}

export function PackagesGrid({ table, resorts }: PackagesGridProps) {
  const rows = table.getRowModel().rows;

  return (
    <div className="flex flex-1 flex-col gap-4">
      {rows.length ? (
        <div className="grid gap-4 px-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const pkg = row.original;
            const inclusionCount = Array.isArray(pkg.inclusions) ? pkg.inclusions.length : 0;

            return (
              <Card key={row.id} size="sm" className="h-full">
                <CardHeader>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar size="lg" className="font-medium">
                      {pkg.image_url ? <AvatarImage src={pkg.image_url} alt="" /> : null}
                      <AvatarFallback>{getInitials(pkg.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <CardTitle className="truncate">{pkg.name}</CardTitle>
                      <CardDescription className="truncate">{pkg.location}</CardDescription>
                    </div>
                  </div>
                  <CardAction>
                    <PackageActions packageData={pkg} resorts={resorts} />
                  </CardAction>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{titleCase(pkg.package_type)}</Badge>
                    <Badge variant="outline">{titleCase(pkg.experience_type)}</Badge>
                    <Badge variant={pkg.is_active ? "default" : "secondary"}>
                      {pkg.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {pkg.description ? (
                    <p className="line-clamp-2 text-muted-foreground text-sm">{pkg.description}</p>
                  ) : null}

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Resort</dt>
                      <dd className="truncate font-medium">{pkg.resort_name ?? "Unassigned"}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Schedule</dt>
                      <dd className="truncate font-medium">{pkg.schedule}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Adult price</dt>
                      <dd className="truncate font-medium tabular-nums">{formatUsd(pkg.adult_price_usd)}</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Child price</dt>
                      <dd className="truncate font-medium tabular-nums">
                        {pkg.child_price_usd == null ? "Not set" : formatUsd(pkg.child_price_usd)}
                      </dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Inclusions</dt>
                      <dd className="truncate font-medium tabular-nums">{inclusionCount} included</dd>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-muted-foreground text-xs">Billing</dt>
                      <dd className="truncate font-medium">
                        {pkg.is_chargeable ? "Chargeable" : "Complimentary"}
                      </dd>
                    </div>
                  </dl>
                </CardContent>

                <CardFooter className="justify-end">
                  <span className="text-muted-foreground text-xs">Updated {formatDate(pkg.updated_at)}</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Empty className="mx-4 min-h-64 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageOpen />
            </EmptyMedia>
            <EmptyTitle>No packages found</EmptyTitle>
            <EmptyDescription>Try changing the search query or one of the active filters.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <PackagesPagination table={table} />
    </div>
  );
}
