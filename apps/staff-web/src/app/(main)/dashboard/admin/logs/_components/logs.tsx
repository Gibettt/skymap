"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
  useTable,
} from "@tanstack/react-table";
import { Download, RefreshCw, Search, SlidersHorizontal } from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";
import { dataTableFeatures } from "@/lib/data-table-features";

import type { AuditLogRow } from "../../_lib/admin-data";
import { formatLogAction, formatLogEntity } from "./log-format";
import { logsColumns } from "./logs-columns";
import { LogsTable } from "./logs-table";

const columnLabels: Record<string, string> = {
  event_time: "Time",
  actor: "Actor",
  action: "Action",
  entity_type: "Entity",
  ip_address: "IP Address",
  user_agent: "User Agent",
};

function uniqueOptions(values: string[]) {
  return ["All", ...Array.from(new Set(values.filter(Boolean))).sort()];
}

function csvCell(value: unknown) {
  let text = "";
  if (typeof value === "string") text = value;
  else if (value !== null && value !== undefined) text = JSON.stringify(value) ?? String(value);
  const safeText = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function Logs({ logs }: { logs: AuditLogRow[] }) {
  const router = useRouter();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [refreshPending, startRefresh] = React.useTransition();
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "event_time", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({
    search: false,
    user_agent: false,
  });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useTable({
    features: dataTableFeatures,
    data: logs,
    columns: logsColumns,
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
      actions: uniqueOptions(logs.map((log) => log.action)),
      entities: uniqueOptions(logs.map((log) => log.entity_type)),
      actors: uniqueOptions(logs.map((log) => log.actor_name ?? "System")),
    }),
    [logs],
  );

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const actionFilter = (table.getColumn("action")?.getFilterValue() as string | undefined) ?? "All";
  const entityFilter = (table.getColumn("entity_type")?.getFilterValue() as string | undefined) ?? "All";
  const actorFilter = (table.getColumn("actor")?.getFilterValue() as string | undefined) ?? "All";
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide());

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  function exportLogs() {
    const header = [
      "Log ID",
      "Event time",
      "Actor ID",
      "Actor name",
      "Actor email",
      "Action",
      "Entity type",
      "Entity ID",
      "IP address",
      "User agent",
      "Before snapshot",
      "After snapshot",
    ];
    const rows = table.getFilteredRowModel().rows.map(({ original }) => [
      original.id,
      new Date(original.created_at).toISOString(),
      original.actor_id,
      original.actor_name ?? "System",
      original.actor_email,
      original.action,
      original.entity_type,
      original.entity_id,
      original.ip_address,
      original.user_agent,
      original.before_data,
      original.after_data,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ephemeris-logs.csv";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle className="text-xl leading-none">Logs</CardTitle>
        <CardDescription className="max-w-sm leading-snug">
          Inspect the latest 200 authentication and data-change events recorded by the system.
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
          <InputGroup className="h-7 w-full md:w-64">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchInputRef}
              className="h-7"
              aria-label="Search logs"
              placeholder="Search logs..."
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
                    {columnLabels[column.id] ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            disabled={refreshPending}
            onClick={() => startRefresh(() => router.refresh())}
          >
            {refreshPending ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
            {refreshPending ? "Refreshing..." : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs} disabled={!logs.length}>
            <Download data-icon="inline-start" />
            Export
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={actionFilter} onValueChange={(value) => setColumnSelectFilter("action", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Action:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.actions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "All" ? option : formatLogAction(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={(value) => setColumnSelectFilter("entity_type", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Entity:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                <SelectGroup>
                  {filterOptions.entities.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "All" ? option : formatLogEntity(option)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Select value={actorFilter} onValueChange={(value) => setColumnSelectFilter("actor", value)}>
            <SelectTrigger size="sm">
              <span className="text-muted-foreground">Actor:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="end">
              <SelectGroup>
                {filterOptions.actors.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="px-4 text-muted-foreground text-sm tabular-nums">
          {table.getFilteredRowModel().rows.length} events
        </div>

        <LogsTable table={table} />
      </CardContent>
    </Card>
  );
}
