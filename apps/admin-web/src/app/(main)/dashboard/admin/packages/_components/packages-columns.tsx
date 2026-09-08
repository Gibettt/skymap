"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import type { PackageRow } from "../../_lib/admin-data";
import { formatDate, formatUsd, titleCase } from "../../_lib/format";
import { PackageActions } from "./package-actions";

export interface PackageResortOption {
  id: string;
  name: string;
}

function PackageStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge className="gap-1.5 border px-2 py-1 font-medium" variant={active ? "default" : "secondary"}>
      <span className="size-1.5 rounded-full bg-current" />
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

export function getPackagesColumns(
  resorts: PackageResortOption[],
): ColumnDef<DataTableFeatures, PackageRow>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        [
          row.name,
          row.location,
          row.resort_name,
          row.package_type,
          row.experience_type,
          row.schedule,
          ...(Array.isArray(row.inclusions) ? row.inclusions : []),
        ]
          .filter(Boolean)
          .join(" "),
      filterFn: "includesString",
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "package",
      accessorFn: (row) => row.name,
      header: "Package",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="font-medium">
            {row.original.image_url ? <AvatarImage src={row.original.image_url} alt="" /> : null}
            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="max-w-56 truncate font-medium text-foreground text-sm">{row.original.name}</div>
            <div className="max-w-56 truncate text-muted-foreground text-sm">{row.original.location}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "package_type",
      header: "Type / Experience",
      filterFn: "equalsString",
      cell: ({ row }) => (
        <div className="grid gap-0.5 whitespace-nowrap">
          <span>{titleCase(row.original.package_type)}</span>
          <span className="text-muted-foreground text-xs">{titleCase(row.original.experience_type)}</span>
        </div>
      ),
    },
    {
      accessorKey: "experience_type",
      header: "Experience",
      filterFn: "equalsString",
      cell: ({ row }) => <div>{titleCase(row.original.experience_type)}</div>,
    },
    {
      id: "resort_name",
      accessorFn: (row) => row.resort_name ?? "Unassigned",
      header: "Resort",
      filterFn: "equalsString",
      cell: ({ row }) => (
        <div className="max-w-44 truncate">{row.original.resort_name ?? "Unassigned"}</div>
      ),
    },
    {
      accessorKey: "schedule",
      header: "Schedule",
      cell: ({ row }) => <div className="max-w-40 truncate">{row.original.schedule}</div>,
    },
    {
      id: "inclusions",
      accessorFn: (row) => (Array.isArray(row.inclusions) ? row.inclusions.length : 0),
      header: "Inclusions",
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-sm tabular-nums">
          {Array.isArray(row.original.inclusions) ? row.original.inclusions.length : 0} included
        </div>
      ),
    },
    {
      id: "pricing",
      accessorFn: (row) => Number(row.adult_price_usd),
      header: "Pricing",
      cell: ({ row }) => (
        <div className="grid gap-0.5 whitespace-nowrap text-right text-sm tabular-nums">
          <span>{formatUsd(row.original.adult_price_usd)} adult</span>
          <span className="text-muted-foreground text-xs">
            {row.original.child_price_usd == null ? "No child rate" : `${formatUsd(row.original.child_price_usd)} child`}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => (row.is_active ? "active" : "inactive"),
      header: "Status",
      filterFn: "equalsString",
      cell: ({ row }) => <PackageStatusBadge active={row.original.is_active} />,
    },
    {
      id: "updated_at",
      accessorFn: (row) => new Date(row.updated_at).getTime(),
      header: "Updated",
      cell: ({ row }) => <div className="whitespace-nowrap text-sm">{formatDate(row.original.updated_at)}</div>,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <PackageActions packageData={row.original} resorts={resorts} />
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
  ];
}
