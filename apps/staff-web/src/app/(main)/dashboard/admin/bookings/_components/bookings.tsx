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

import type { BookingOptions, BookingRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";
import { createBookingsColumns } from "./bookings-columns";
import { BookingsGrid } from "./bookings-grid";
import { BookingsPagination } from "./bookings-pagination";
import { BookingsTable } from "./bookings-table";

type BookingView = "list" | "grid";

const columnLabels: Record<string, string> = {
  guest: "Booking",
  eventDate: "Schedule",
  package_name: "Package",
  staff_name: "Staff",
  resort: "Resort",
  guests: "Guests",
  status: "Status",
  invoice: "Invoice",
};

function uniqueOptions(values: Array<string | null>) {
  return ["All", ...Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort()];
}

export function Bookings({ bookings, options }: { bookings: BookingRow[]; options: BookingOptions }) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "eventDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [view, setView] = React.useState<BookingView>("list");
  const columns = React.useMemo(() => createBookingsColumns(options), [options]);

  const table = useTable({
    features: dataTableFeatures,
    data: bookings,
    columns,
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
      statuses: uniqueOptions(bookings.map((booking) => booking.status)),
      packages: uniqueOptions(bookings.map((booking) => booking.package_name)),
      staff: uniqueOptions(bookings.map((booking) => booking.staff_name)),
      resorts: uniqueOptions(bookings.map((booking) => booking.resort_name ?? "Unassigned")),
    }),
    [bookings],
  );

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "All";
  const packageFilter = (table.getColumn("package_name")?.getFilterValue() as string | undefined) ?? "All";
  const staffFilter = (table.getColumn("staff_name")?.getFilterValue() as string | undefined) ?? "All";
  const resortFilter = (table.getColumn("resort")?.getFilterValue() as string | undefined) ?? "All";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide());

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  async function exportBookings() {
    const rows = table.getFilteredRowModel().rows.map(({ original }) => original);
    await downloadExcelReport({
      title: "SpaceCat ASTROTOURISM — Bookings",
      subtitle: "Filtered administration booking records",
      filename: `ephemeris-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Bookings",
      columns: [
        { key: "bookingCode", header: "Booking code", width: 24 },
        { key: "guest", header: "Guest", width: 24 },
        { key: "eventDate", header: "Event date", width: 16, kind: "date" },
        { key: "time", header: "Time", width: 18 },
        { key: "package", header: "Package", width: 27 },
        { key: "staff", header: "Staff", width: 23 },
        { key: "resort", header: "Resort", width: 28 },
        { key: "status", header: "Status", width: 18, kind: "status" },
        { key: "guests", header: "Guests", width: 11, kind: "number" },
        { key: "invoice", header: "Invoice (USD)", width: 18, kind: "currency" },
      ],
      rows: rows.map((booking) => ({
        bookingCode: booking.booking_code,
        guest: booking.guest_name,
        eventDate: booking.event_date,
        time: `${booking.time_start?.slice(0, 5) ?? "-"} - ${booking.time_end?.slice(0, 5) ?? "-"}`,
        package: booking.package_name,
        staff: booking.staff_name,
        resort: booking.resort_name ?? "Unassigned",
        status: titleCase(booking.status),
        guests: Number(booking.adult_count) + Number(booking.child_count),
        invoice: Number(booking.invoice_total_usd),
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
        <CardTitle className="text-xl leading-none">Bookings</CardTitle>
        <CardDescription className="max-w-sm leading-snug">
          Manage booking schedules, guests, assignments, and status.
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          <InputGroup className="h-7 w-full md:w-64">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              className="h-7"
              aria-label="Search bookings"
              placeholder="Search bookings..."
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

          <Button variant="outline" size="sm" onClick={exportBookings} disabled={!bookings.length}>
            <Download data-icon="inline-start" />
            Export
          </Button>
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

            <Select value={packageFilter} onValueChange={(value) => setColumnSelectFilter("package_name", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Package:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.packages.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={staffFilter} onValueChange={(value) => setColumnSelectFilter("staff_name", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Staff:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.staff.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Select value={resortFilter} onValueChange={(value) => setColumnSelectFilter("resort", value)}>
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
            {selectedCount} selected / {table.getFilteredRowModel().rows.length} bookings
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

        {view === "list" ? <BookingsTable table={table} /> : <BookingsGrid table={table} options={options} />}
      </CardContent>
      {table.getFilteredRowModel().rows.length ? <BookingsPagination table={table} /> : null}
    </Card>
  );
}
