"use client";

import * as React from "react";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { Download, Grid, Rows3, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataTableFeatures } from "@/lib/data-table-features";

import { CreateUserDialog } from "../../_components/create-dialogs";
import type { UserRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";
import type { UserResortOption } from "./user-actions";
import { UsersGrid } from "./users-grid";
import { getUsersColumns } from "./users-columns";
import { UsersTable } from "./users-table";

type UserView = "list" | "grid";

const columnLabels: Record<string, string> = {
  user: "User",
  role: "Role",
  resort_name: "Resort",
  status: "Status",
  presence: "Presence",
  total_booking: "Bookings",
  joined_at: "Joined",
};

function uniqueOptions(values: string[]) {
  return ["All", ...Array.from(new Set(values.filter(Boolean))).sort()];
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function AdminUsers({ users, resorts }: { users: UserRow[]; resorts: UserResortOption[] }) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const columns = React.useMemo(() => getUsersColumns(resorts), [resorts]);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "joined_at", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [view, setView] = React.useState<UserView>("list");

  const table = useTable({
    features: dataTableFeatures,
    data: users,
    columns,
    state: { sorting, columnFilters, columnVisibility, pagination },
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  React.useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const filterOptions = React.useMemo(
    () => ({
      roles: uniqueOptions(users.map((user) => user.role)),
      statuses: uniqueOptions(users.map((user) => user.status)),
      presence: uniqueOptions(users.map((user) => user.presence ?? "not tracked")),
      resorts: uniqueOptions(users.map((user) => user.resort_name ?? "Unassigned")),
    }),
    [users],
  );

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const roleFilter = (table.getColumn("role")?.getFilterValue() as string | undefined) ?? "All";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "All";
  const presenceFilter = (table.getColumn("presence")?.getFilterValue() as string | undefined) ?? "All";
  const resortFilter = (table.getColumn("resort_name")?.getFilterValue() as string | undefined) ?? "All";
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide());

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  function changeView(value: string) {
    if (value === "list" || value === "grid") setView(value);
  }

  function exportUsers() {
    const header = ["Name", "Email", "Phone", "Role", "Resort", "Status", "Presence", "Bookings", "Joined"];
    const rows = table.getFilteredRowModel().rows.map(({ original }) => [
      original.name,
      original.email,
      original.phone ?? "",
      titleCase(original.role),
      original.resort_name ?? "Unassigned",
      titleCase(original.status),
      original.presence ? titleCase(original.presence) : "Not tracked",
      original.total_booking,
      new Date(original.created_at).toISOString(),
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ephemeris-users.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">Users</CardTitle>
        <CardDescription className="max-w-sm leading-snug">
          Manage administrator and staff accounts, access, presence, and resort assignments.
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          <InputGroup className="h-7 w-full md:w-64">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              className="h-7"
              aria-label="Search users"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(event) => {
                table.getColumn("search")?.setFilterValue(event.target.value || undefined);
                table.setPageIndex(0);
              }}
            />
            <InputGroupAddon align="inline-end">
              <Kbd className="h-4 text-[10px]">Ctrl K</Kbd>
            </InputGroupAddon>
          </InputGroup>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontal data-icon="inline-start" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {hideableColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {columnLabels[column.id] ?? titleCase(column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={exportUsers} disabled={!users.length}>
            <Download data-icon="inline-start" />
            Export
          </Button>
          <CreateUserDialog resorts={resorts} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={roleFilter} onValueChange={(value) => setColumnSelectFilter("role", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Role:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.roles.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "All" ? option : titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(value) => setColumnSelectFilter("status", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Status:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.statuses.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "All" ? option : titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={presenceFilter} onValueChange={(value) => setColumnSelectFilter("presence", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Presence:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.presence.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "All" ? option : titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Select value={resortFilter} onValueChange={(value) => setColumnSelectFilter("resort_name", value)}>
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Resort:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                {filterOptions.resorts.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 px-4">
          <div className="text-muted-foreground text-sm tabular-nums">
            {table.getFilteredRowModel().rows.length} users
          </div>

          <Tabs value={view} onValueChange={changeView}>
            <TabsList aria-label="User view">
              <TabsTrigger value="list" aria-label="List view" title="List view">
                <Rows3 />
              </TabsTrigger>
              <TabsTrigger value="grid" aria-label="Card view" title="Card view">
                <Grid />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {view === "list" ? <UsersTable table={table} /> : <UsersGrid table={table} resorts={resorts} />}
      </CardContent>
    </Card>
  );
}
