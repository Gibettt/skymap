"use client";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { DataTableFeatures } from "@/lib/data-table-features";

import { RoleActions } from "../role-actions";
import type { PermissionDefinition, Role, RoleMember } from "./data";

function formatReviewDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function getRolesColumns(
  permissions: PermissionDefinition[],
  members: RoleMember[],
  readOnly: boolean,
): ColumnDef<DataTableFeatures, Role>[] {
  return [
    {
      id: "group",
      accessorKey: "group",
      filterFn: "equalsString",
      enableHiding: true,
    },
    {
      id: "search",
      accessorFn: (row) => [row.role, row.owner, ...row.permissionSets].join(" "),
      filterFn: "includesString",
      enableHiding: true,
    },
    {
      id: "role",
      accessorKey: "role",
      header: "Role",
      size: 180,
      minSize: 180,
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.role}</span>,
    },
    {
      id: "accessLevel",
      accessorKey: "accessLevel",
      header: "Access level",
      size: 120,
      cell: ({ row }) => (
        <Badge className="rounded-sm" variant="outline">
          {row.original.accessLevel}
        </Badge>
      ),
    },
    {
      id: "users",
      accessorKey: "users",
      header: "Users",
      size: 70,
      cell: ({ row }) => <span className="text-sm">{row.original.users}</span>,
    },
    {
      id: "permissionSets",
      accessorFn: (row) => row.permissionSets.join(" "),
      header: "Permission sets",
      size: 310,
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center justify-start gap-2">
          {row.original.permissionSets.slice(0, 3).map((set) => (
            <Badge className="rounded-sm" variant="outline" key={set}>
              {set}
            </Badge>
          ))}
          {row.original.permissionSets.length > 3 ? (
            <span className="text-sm tabular-nums">+{row.original.permissionSets.length - 3}</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "lastReview",
      accessorKey: "lastReview",
      header: "Last review",
      size: 120,
      cell: ({ row }) => <span className="text-sm">{formatReviewDate(row.original.lastReview)}</span>,
    },
    {
      id: "owner",
      accessorKey: "owner",
      header: "Owner",
      size: 110,
      filterFn: "equalsString",
      cell: ({ row }) => <span className="text-sm">{row.original.owner}</span>,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      size: 130,
      filterFn: "equalsString",
      cell: ({ row }) => (
        <Badge className="rounded-sm" variant="outline">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      size: 70,
      cell: ({ row }) => (
        <RoleActions role={row.original} permissions={permissions} members={members} readOnly={readOnly} />
      ),
      enableColumnFilter: false,
    },
  ];
}
