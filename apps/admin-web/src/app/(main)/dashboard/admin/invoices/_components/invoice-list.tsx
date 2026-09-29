"use client";

import * as React from "react";

import { CheckCircle2, Eye, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { InvoiceRow } from "../../_lib/admin-data";
import { formatUsd } from "../../_lib/format";

function snapshotText(invoice: InvoiceRow, key: string) {
  const value = invoice.source_snapshot[key];
  return value == null ? "" : String(value);
}

export function InvoiceList({
  invoices,
  pendingId,
  onOpen,
  onToggleResortStatus,
}: {
  invoices: InvoiceRow[];
  pendingId: string | null;
  onOpen: (invoice: InvoiceRow) => void;
  onToggleResortStatus: (invoice: InvoiceRow) => void;
}) {
  const [search, setSearch] = React.useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const rows = invoices.filter((invoice) => {
    if (!normalizedSearch) return true;
    return [
      invoice.invoice_number,
      invoice.recipient_name,
      invoice.recipient_email,
      invoice.source_reference,
      snapshotText(invoice, "resort_name"),
      snapshotText(invoice, "room_number"),
    ].some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  });

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-lg">Invoice list</h2>
          <p className="text-muted-foreground text-sm">Click or double-click an invoice to open its full details.</p>
        </div>
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Search invoice, guest, room..."
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/60 text-left text-muted-foreground text-xs uppercase">
            <tr>
              <th className="p-3">Invoice</th>
              <th className="p-3">Guest / recipient</th>
              <th className="p-3">Resort</th>
              <th className="p-3">Room</th>
              <th className="p-3">Resort system</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => (
              <tr
                key={invoice.id}
                className="cursor-pointer border-t transition-colors hover:bg-muted/45"
                onClick={() => onOpen(invoice)}
                onDoubleClick={() => onOpen(invoice)}
              >
                <td className="p-3">
                  <p className="font-medium">{invoice.invoice_number}</p>
                  <p className="text-muted-foreground text-xs">
                    {invoice.invoice_type === "customer" ? "Guest invoice" : "Staff payout"}
                  </p>
                </td>
                <td className="p-3">
                  <p>{invoice.recipient_name}</p>
                  <p className="text-muted-foreground text-xs">{invoice.recipient_email ?? "No email"}</p>
                </td>
                <td className="p-3">{snapshotText(invoice, "resort_name") || invoice.recipient_detail || "—"}</td>
                <td className="p-3">{snapshotText(invoice, "room_number") || "—"}</td>
                <td className="p-3">
                  {invoice.invoice_type === "customer" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingId === invoice.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleResortStatus(invoice);
                      }}
                    >
                      <CheckCircle2 data-icon="inline-start" />
                      {invoice.resort_recorded_at ? "Entered" : "Mark entered"}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-right font-medium">{formatUsd(invoice.total_usd)}</td>
                <td className="p-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(invoice);
                    }}
                  >
                    <Eye data-icon="inline-start" />
                    Open
                  </Button>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  No invoices match this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
