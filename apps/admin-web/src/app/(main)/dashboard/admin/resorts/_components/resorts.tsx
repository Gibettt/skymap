"use client";

import * as React from "react";

import { downloadExcelReport } from "@ephemeris/export";
import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { Download, Grid, Rows3, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dataTableFeatures } from "@/lib/data-table-features";

import { CreateResortDialog } from "../../_components/create-dialogs";
import type { ResortRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";
import { resortsColumns } from "./resorts-columns";
import { ResortsGrid } from "./resorts-grid";
import { ResortsPagination } from "./resorts-pagination";
import { ResortsTable } from "./resorts-table";

type ResortView = "list" | "grid";

const columnLabels: Record<string, string> = {
  resort: "Resort",
  location: "Location",
  status: "Status",
  coverage_status: "Coverage",
  staff: "Active Staff",
  bookings: "Bookings",
};

function uniqueOptions(values: string[]) {
  return ["All", ...Array.from(new Set(values.filter(Boolean))).sort()];
}

export function Resorts({ resorts }: { resorts: ResortRow[] }) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "resort", desc: false }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [view, setView] = React.useState<ResortView>("list");

  const table = useTable({
    features: dataTableFeatures,
    data: resorts,
    columns: resortsColumns,
    state: { rowSelection, sorting, columnFilters, columnVisibility, pagination },
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
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
      statuses: uniqueOptions(resorts.map((resort) => resort.status)),
      coverage: uniqueOptions(resorts.map((resort) => resort.coverage_status)),
      locations: uniqueOptions(resorts.map((resort) => resort.location)),
    }),
    [resorts],
  );

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "All";
  const coverageFilter = (table.getColumn("coverage_status")?.getFilterValue() as string | undefined) ?? "All";
  const locationFilter = (table.getColumn("location")?.getFilterValue() as string | undefined) ?? "All";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide());

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  async function exportResorts() {
    const rows = table.getFilteredRowModel().rows.map(({ original }) => original);
    await downloadExcelReport({
      title: "SpaceCat ASTROTOURISM — Partner Resorts",
      subtitle: "Filtered resort coverage and booking activity",
      filename: `ephemeris-resorts-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Resorts",
      columns: [
        { key: "name", header: "Name", width: 28 },
        { key: "code", header: "Code", width: 12 },
        { key: "location", header: "Location", width: 26 },
        { key: "status", header: "Status", width: 14, kind: "status" },
        { key: "coverage", header: "Coverage", width: 18, kind: "status" },
        { key: "internalStaff", header: "Active internal staff", width: 20, kind: "number" },
        { key: "externalStaff", header: "Active external staff", width: 20, kind: "number" },
        { key: "totalBookings", header: "Total bookings", width: 16, kind: "number" },
        { key: "openBookings", header: "Open bookings", width: 16, kind: "number" },
      ],
      rows: rows.map((resort) => ({
        name: resort.name,
        code: resort.code,
        location: resort.location,
        status: titleCase(resort.status),
        coverage: titleCase(resort.coverage_status),
        internalStaff: Number(resort.active_internal_count),
        externalStaff: Number(resort.active_external_count),
        totalBookings: Number(resort.total_bookings_count),
        openBookings: Number(resort.open_bookings_count),
      })),
    });
  }

  function changeView(value: string) {
    if (value !== "list" && value !== "grid") return;

    setView(value);
    table.setPageSize(value === "grid" ? 9 : 10);
    table.setPageIndex(0);
  }

  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">Partner Resorts</CardTitle>
        <CardDescription className="max-w-sm leading-snug">
          Manage staff coverage and booking activity for every partner resort.
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          <InputGroup className="h-7 w-full md:w-64">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              className="h-7"
              aria-label="Search partner resorts"
              placeholder="Search resorts..."
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
            <DropdownMenuContent align="end" className="w-40">
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

          <Button variant="outline" size="sm" onClick={exportResorts} disabled={!resorts.length}>
            <Download data-icon="inline-start" />
            Export
          </Button>
          <CreateResortDialog />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
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

            <Select value={coverageFilter} onValueChange={(value) => setColumnSelectFilter("coverage_status", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Coverage:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.coverage.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "All" ? option : titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Select value={locationFilter} onValueChange={(value) => setColumnSelectFilter("location", value)}>
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Location:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                {filterOptions.locations.map((option) => (
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
            {selectedCount} selected / {table.getFilteredRowModel().rows.length} resorts
          </div>

          <Tabs value={view} onValueChange={changeView}>
            <TabsList>
              <TabsTrigger value="list" aria-label="List view">
                <Rows3 />
              </TabsTrigger>
              <TabsTrigger value="grid" aria-label="Grid view">
                <Grid />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {view === "list" ? <ResortsTable table={table} /> : <ResortsGrid table={table} />}
      </CardContent>
      {table.getFilteredRowModel().rows.length ? <ResortsPagination table={table} /> : null}
    </Card>
  );
}
