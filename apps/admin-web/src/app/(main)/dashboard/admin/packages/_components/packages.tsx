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

import { CreatePackageDialog } from "../../_components/create-dialogs";
import type { PackageRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";
import { getPackagesColumns, type PackageResortOption } from "./packages-columns";
import { PackagesGrid } from "./packages-grid";
import { PackagesTable } from "./packages-table";

type PackageView = "list" | "grid";

const columnLabels: Record<string, string> = {
  package: "Package",
  package_type: "Type / Experience",
  experience_type: "Experience",
  resort_name: "Resort",
  schedule: "Schedule",
  inclusions: "Inclusions",
  pricing: "Pricing",
  status: "Status",
  updated_at: "Updated",
};

function uniqueOptions(values: string[]) {
  return ["All", ...Array.from(new Set(values.filter(Boolean))).sort()];
}

function csvCell(value: string | number | boolean | null | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function Packages({ packages, resorts }: { packages: PackageRow[]; resorts: PackageResortOption[] }) {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const columns = React.useMemo(() => getPackagesColumns(resorts), [resorts]);
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "updated_at", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
    experience_type: false,
  });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [view, setView] = React.useState<PackageView>("list");

  const table = useTable({
    features: dataTableFeatures,
    data: packages,
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
      packageTypes: uniqueOptions(packages.map((pkg) => pkg.package_type)),
      experienceTypes: uniqueOptions(packages.map((pkg) => pkg.experience_type)),
      statuses: ["All", "active", "inactive"],
      resorts: uniqueOptions(packages.map((pkg) => pkg.resort_name ?? "Unassigned")),
    }),
    [packages],
  );

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const packageTypeFilter = (table.getColumn("package_type")?.getFilterValue() as string | undefined) ?? "All";
  const experienceFilter =
    (table.getColumn("experience_type")?.getFilterValue() as string | undefined) ?? "All";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "All";
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

  function exportPackages() {
    const header = [
      "Name",
      "Package type",
      "Experience type",
      "Resort",
      "Location",
      "Schedule",
      "Adult price (USD)",
      "Child price (USD)",
      "Child age range",
      "Chargeable",
      "Status",
      "Inclusions",
    ];
    const rows = table.getFilteredRowModel().rows.map(({ original }) => [
      original.name,
      titleCase(original.package_type),
      titleCase(original.experience_type),
      original.resort_name ?? "Unassigned",
      original.location,
      original.schedule,
      Number(original.adult_price_usd),
      original.child_price_usd == null ? "" : Number(original.child_price_usd),
      original.child_age_range ?? "",
      original.is_chargeable ? "Yes" : "No",
      original.is_active ? "Active" : "Inactive",
      Array.isArray(original.inclusions) ? original.inclusions.join("; ") : "",
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ephemeris-packages.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">Packages</CardTitle>
        <CardDescription className="max-w-sm leading-snug">
          Manage experience packages, pricing, availability, and resort assignments.
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          <InputGroup className="h-7 w-full md:w-64">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              className="h-7"
              aria-label="Search packages"
              placeholder="Search packages..."
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

          <Button variant="outline" size="sm" onClick={exportPackages} disabled={!packages.length}>
            <Download data-icon="inline-start" />
            Export
          </Button>
          <CreatePackageDialog resorts={resorts} />
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={packageTypeFilter}
              onValueChange={(value) => setColumnSelectFilter("package_type", value)}
            >
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Type:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.packageTypes.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "All" ? option : titleCase(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={experienceFilter}
              onValueChange={(value) => setColumnSelectFilter("experience_type", value)}
            >
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Experience:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.experienceTypes.map((option) => (
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
            {table.getFilteredRowModel().rows.length} packages
          </div>

          <Tabs value={view} onValueChange={changeView}>
            <TabsList aria-label="Package view">
              <TabsTrigger value="list" aria-label="List view" title="List view">
                <Rows3 />
              </TabsTrigger>
              <TabsTrigger value="grid" aria-label="Card view" title="Card view">
                <Grid />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {view === "list" ? <PackagesTable table={table} /> : <PackagesGrid table={table} resorts={resorts} />}
      </CardContent>
    </Card>
  );
}
