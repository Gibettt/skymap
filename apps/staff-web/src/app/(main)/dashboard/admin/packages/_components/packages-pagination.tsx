"use client";

import type { ReactTable } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import type { DataTableFeatures } from "@/lib/data-table-features";

import type { PackageRow } from "../../_lib/admin-data";

export function PackagesPagination({ table }: { table: ReactTable<DataTableFeatures, PackageRow> }) {
  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = Math.min(table.state.pagination.pageIndex + 1, pageCount);
  const pageSize = table.state.pagination.pageSize;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const firstVisible = filteredCount ? (currentPage - 1) * pageSize + 1 : 0;
  const lastVisible = Math.min(currentPage * pageSize, filteredCount);

  return (
    <CardFooter className="flex-col justify-between gap-3 sm:flex-row">
      <p className="text-muted-foreground text-sm tabular-nums">
        Showing {firstVisible}-{lastVisible} of {filteredCount}
      </p>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>
          Previous
        </Button>
        <Badge variant="outline">
          Page {currentPage} of {pageCount}
        </Badge>
        <Button variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>
          Next
        </Button>
      </div>
    </CardFooter>
  );
}
