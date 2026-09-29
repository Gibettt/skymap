"use client";

import * as React from "react";

import { Download, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { InvoiceRow } from "../../_lib/admin-data";
import { formatUsd } from "../../_lib/format";

export interface MonthlyInvoiceRow {
  id: string;
  invoiceNumber: string;
  packageName: string;
  guestName: string;
  roomNumber: string;
  pax: number;
  kids: number;
  netAmount: number;
  serviceCharge: number;
  resortAmount: number;
}

export interface MonthlyInvoiceDocumentData {
  month: string;
  resortName: string;
  rows: MonthlyInvoiceRow[];
}

function snapshotText(invoice: InvoiceRow, key: string) {
  const value = invoice.source_snapshot[key];
  return value == null || value === "" ? "" : String(value);
}

function snapshotNumber(invoice: InvoiceRow, key: string) {
  const value = Number(invoice.source_snapshot[key]);
  return Number.isFinite(value) ? value : 0;
}

function invoiceMonth(invoice: InvoiceRow) {
  return (snapshotText(invoice, "event_date") || invoice.issued_at).slice(0, 7);
}

function invoiceResort(invoice: InvoiceRow) {
  return snapshotText(invoice, "resort_name") || "Unassigned resort";
}

function toMonthlyRow(invoice: InvoiceRow): MonthlyInvoiceRow {
  const adults = snapshotNumber(invoice, "adult_count");
  const kids = snapshotNumber(invoice, "child_count");
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    packageName: [...new Set(invoice.line_items.map((item) => item.description))].join(", ") || "Experience",
    guestName: invoice.recipient_name,
    roomNumber: snapshotText(invoice, "room_number") || "—",
    pax: adults + kids,
    kids,
    netAmount: invoice.subtotal_usd,
    serviceCharge: invoice.service_charge_usd,
    resortAmount: Math.round((invoice.subtotal_usd * 0.5 + invoice.service_charge_usd) * 100) / 100,
  };
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

export function MonthlyResortInvoiceDocument({ data }: { data: MonthlyInvoiceDocumentData }) {
  const netTotal = data.rows.reduce((total, row) => total + row.netAmount, 0);
  const serviceTotal = data.rows.reduce((total, row) => total + row.serviceCharge, 0);
  const resortTotal = data.rows.reduce((total, row) => total + row.resortAmount, 0);

  return (
    <article
      data-print-paper
      data-monthly-invoice-document
      className="min-h-[1056px] w-[816px] bg-white px-10 py-10 font-mono text-neutral-950"
    >
      <header className="flex items-start justify-between border-neutral-300 border-b pb-7">
        <div>
          <p className="font-semibold text-xs uppercase tracking-[0.25em]">SpaceCat ASTROTOURISM</p>
          <h1 className="mt-2 font-semibold text-3xl">Monthly Resort Invoice</h1>
          <p className="mt-2 text-neutral-600 text-sm">{monthLabel(data.month)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">Bill to</p>
          <p>{data.resortName}</p>
          <p>Maldives</p>
        </div>
      </header>

      <section className="mt-8 overflow-hidden border border-neutral-300 text-[11px]">
        <div className="grid grid-cols-[1.25fr_1fr_70px_44px_44px_82px_82px_92px] bg-neutral-200 px-2 py-3 font-semibold uppercase">
          <span>Package</span>
          <span>Guest</span>
          <span>Room</span>
          <span className="text-right">Pax</span>
          <span className="text-right">Kids</span>
          <span className="text-right">Net</span>
          <span className="text-right">Service</span>
          <span className="text-right">Resort bill</span>
        </div>
        {data.rows.map((row) => (
          <div
            key={row.id}
            className="grid break-inside-avoid grid-cols-[1.25fr_1fr_70px_44px_44px_82px_82px_92px] border-neutral-200 border-t px-2 py-3"
          >
            <span>{row.packageName}</span>
            <span>{row.guestName}</span>
            <span>{row.roomNumber}</span>
            <span className="text-right">{row.pax}</span>
            <span className="text-right">{row.kids}</span>
            <span className="text-right">{formatUsd(row.netAmount)}</span>
            <span className="text-right">{formatUsd(row.serviceCharge)}</span>
            <span className="text-right font-semibold">{formatUsd(row.resortAmount)}</span>
          </div>
        ))}
      </section>

      <section className="mt-8 ml-auto w-80 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Total net amount</span>
          <span>{formatUsd(netTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>50% net amount</span>
          <span>{formatUsd(netTotal * 0.5)}</span>
        </div>
        <div className="flex justify-between">
          <span>100% service charge</span>
          <span>{formatUsd(serviceTotal)}</span>
        </div>
        <div className="flex justify-between border-neutral-900 border-y-2 py-3 font-semibold">
          <span>AMOUNT DUE</span>
          <span>{formatUsd(resortTotal)}</span>
        </div>
      </section>

      <footer className="mt-12 border-neutral-300 border-t pt-5 text-neutral-500 text-xs">
        <p>GST is excluded from this consolidated resort invoice.</p>
        <p>Calculation: 50% of net amount + 100% of service charge.</p>
      </footer>
    </article>
  );
}

export function MonthlyResortInvoice({
  invoices,
  onPrint,
}: {
  invoices: InvoiceRow[];
  onPrint: (data: MonthlyInvoiceDocumentData, pdf: boolean) => void;
}) {
  const signedInvoices = invoices.filter((invoice) => invoice.invoice_type === "customer" && invoice.signed_at);
  const latestMonth = signedInvoices.map(invoiceMonth).sort().at(-1) ?? new Date().toISOString().slice(0, 7);
  const resorts = [...new Set(signedInvoices.map(invoiceResort))].sort();
  const [month, setMonth] = React.useState(latestMonth);
  const [resort, setResort] = React.useState(resorts[0] ?? "");
  const rows = signedInvoices
    .filter((invoice) => invoiceMonth(invoice) === month && invoiceResort(invoice) === resort)
    .map(toMonthlyRow);
  const resortTotal = rows.reduce((total, row) => total + row.resortAmount, 0);
  const data = { month, resortName: resort, rows };

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-lg">Monthly resort invoice</h2>
            <Badge variant="outline">GST excluded</Badge>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">50% net amount plus 100% service charge.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[10rem_minmax(13rem,1fr)_auto]">
          <Input
            aria-label="Invoice month"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
          <Select value={resort} onValueChange={setResort}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select resort" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {resorts.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="flex">
            <Button type="button" variant="outline" disabled={!rows.length} onClick={() => onPrint(data, false)}>
              <Printer data-icon="inline-start" />
              Print
            </Button>
            <Button type="button" variant="outline" disabled={!rows.length} onClick={() => onPrint(data, true)}>
              <Download data-icon="inline-start" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-muted/60 text-left text-muted-foreground text-xs uppercase">
            <tr>
              <th className="p-3">Package</th>
              <th className="p-3">Guest</th>
              <th className="p-3">Room</th>
              <th className="p-3 text-right">Pax</th>
              <th className="p-3 text-right">Kids</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3 text-right">Service</th>
              <th className="p-3 text-right">Resort bill</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">{row.packageName}</td>
                <td className="p-3">{row.guestName}</td>
                <td className="p-3">{row.roomNumber}</td>
                <td className="p-3 text-right">{row.pax}</td>
                <td className="p-3 text-right">{row.kids}</td>
                <td className="p-3 text-right">{formatUsd(row.netAmount)}</td>
                <td className="p-3 text-right">{formatUsd(row.serviceCharge)}</td>
                <td className="p-3 text-right font-semibold">{formatUsd(row.resortAmount)}</td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No signed guest invoices for this resort and month.
                </td>
              </tr>
            ) : null}
          </tbody>
          {rows.length ? (
            <tfoot>
              <tr className="border-t bg-muted/40 font-semibold">
                <td colSpan={7} className="p-3 text-right">
                  Amount due
                </td>
                <td className="p-3 text-right">{formatUsd(resortTotal)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
}
