"use client";

import * as React from "react";
import Image from "next/image";
import { CheckCircle2, Download, PenLine, Printer, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { formatUsd } from "../../_lib/staff-api";
import type { InvoiceRow, MonthlyInvoiceStaffSignature, MonthlyInvoiceSubmission, PaymentWorkflowRow } from "./types";
import { INVOICE_PAPER_HEIGHT, INVOICE_PAPER_WIDTH } from "./invoice-document";

export interface MonthlyStaffInvoiceData {
  month: string;
  resortName: string;
  invoices: InvoiceRow[];
  signature: MonthlyInvoiceStaffSignature | null;
  submission?: MonthlyInvoiceSubmission | null;
}

function snapshotText(invoice: InvoiceRow, key: string) {
  const value = invoice.source_snapshot[key];
  return value == null || value === "" ? "" : String(value);
}

function snapshotNumber(invoice: InvoiceRow, key: string) {
  const value = Number(invoice.source_snapshot[key]);
  return Number.isFinite(value) ? value : 0;
}

export function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatVoucherDate(value: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function SubmissionActionIcon({ pending, resubmission }: { pending: boolean; resubmission: boolean }) {
  if (pending) return <Spinner data-icon="inline-start" />;
  if (resubmission) return <CheckCircle2 data-icon="inline-start" />;
  return <Send data-icon="inline-start" />;
}

export function MonthlyStaffInvoiceDocument({ data }: { data: MonthlyStaffInvoiceData }) {
  const subtotal = data.invoices.reduce((total, invoice) => total + invoice.subtotal_usd, 0);
  const service = data.invoices.reduce((total, invoice) => total + invoice.service_charge_usd, 0);
  const tax = data.invoices.reduce((total, invoice) => total + invoice.tax_usd, 0);
  const customerTotal = data.invoices.reduce((total, invoice) => total + invoice.total_usd, 0);

  const monthCode = data.month.replace("-", "").slice(2);
  const formattedToday = formatVoucherDate(new Date());

  return (
    <article
      style={{ height: INVOICE_PAPER_HEIGHT, width: INVOICE_PAPER_WIDTH }}
      data-print-paper
      data-monthly-staff-invoice
      className="relative flex flex-col justify-between bg-white px-12 py-10 font-sans text-neutral-950 shadow-md select-none print:shadow-none"
    >
      <div>
        {/* Top Header: SpaceCat Logo & Resort details */}
        <header className="flex flex-col items-center justify-center text-center">
          <div className="relative size-14 overflow-hidden rounded-full border border-neutral-300 shadow-xs">
            <Image
              src="/spacecat-astrotourism-logo.jpg"
              alt="SpaceCat ASTROTOURISM"
              width={56}
              height={56}
              priority
              className="size-full object-cover"
            />
          </div>

          <h1 className="mt-2.5 font-serif font-bold text-base tracking-[0.2em] uppercase text-neutral-900">
            SpaceCat ASTROTOURISM
          </h1>
          <p className="font-serif text-[11px] tracking-wider uppercase text-neutral-600">
            {data.resortName ? `${data.resortName.toUpperCase()} · MALDIVES` : "LE MERIDIEN MALDIVES · MALDIVES"}
          </p>
          <p className="mt-0.5 text-[10px] text-neutral-500">
            Maamunagau Island, Raa Atoll, Rep of Maldives
          </p>
          <p className="text-[10px] text-neutral-500">
            T: +960 658 0500 &nbsp; F: +960 658 0555
          </p>

          <h2 className="mt-5 w-full border-neutral-300 border-y py-2 text-center font-serif font-bold text-sm tracking-[0.25em] uppercase text-neutral-900">
            MISCELLANEOUS CHARGE VOUCHER
          </h2>
        </header>

        {/* Voucher Metadata Header */}
        <section className="mt-5 grid grid-cols-[1fr_210px] gap-x-8 gap-y-2.5 text-xs">
          <div className="flex items-baseline gap-2 border-neutral-300 border-b pb-1">
            <span className="min-w-24 font-serif font-medium text-neutral-700">Period / Month :</span>
            <span className="font-mono font-bold text-neutral-900 uppercase tracking-wide">
              {monthLabel(data.month).toUpperCase()}
            </span>
          </div>
          <div className="flex items-baseline gap-2 border-neutral-300 border-b pb-1">
            <span className="min-w-20 font-serif font-medium text-neutral-700">Serial No :</span>
            <span className="font-mono font-bold text-base text-red-600 tracking-wider">
              {monthCode}M
            </span>
          </div>

          <div className="flex items-baseline gap-2 border-neutral-300 border-b pb-1">
            <span className="min-w-24 font-serif font-medium text-neutral-700">Invoices :</span>
            <span className="font-mono font-semibold text-neutral-900">
              {data.invoices.length} {data.invoices.length === 1 ? "Customer Invoice" : "Customer Invoices"}
            </span>
          </div>
          <div className="flex items-baseline gap-2 border-neutral-300 border-b pb-1">
            <span className="min-w-20 font-serif font-medium text-neutral-700">Date :</span>
            <span className="font-mono font-semibold text-neutral-900">
              {formattedToday}
            </span>
          </div>
        </section>

        {/* Category Header above Table */}
        <div className="mt-4 flex justify-end px-1">
          <span className="font-serif font-semibold text-neutral-800 text-xs italic tracking-wide">
            Monthly Experience Register
          </span>
        </div>

        {/* Ruled / Lined Voucher Table */}
        <section className="mt-1.5 overflow-hidden rounded-xs border border-neutral-800">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_150px] border-neutral-800 border-b bg-neutral-100 font-serif font-bold text-xs uppercase text-neutral-900">
            <div className="border-neutral-800 border-r px-4 py-2">Detailed Explanation</div>
            <div className="px-4 py-2 text-right">Amount (USD)</div>
          </div>

          {/* Table Body with Ruled Lines */}
          <div className="divide-y divide-neutral-300 text-xs">
            {data.invoices.map((invoice) => {
              const packageTitle = [...new Set(invoice.line_items.map((item) => item.description))].join(", ") || "Stargazing Experience";
              return (
                <div key={invoice.id} className="grid grid-cols-[1fr_150px] min-h-8">
                  <div className="flex items-center border-neutral-800 border-r px-4 py-1.5 font-serif font-bold text-xs tracking-wide text-neutral-900">
                    <span>{packageTitle}</span>
                    <span className="ml-2 font-mono text-[10px] text-neutral-500 font-normal">
                      ({invoice.recipient_name} · Ref: {invoice.invoice_number.slice(-8)})
                    </span>
                  </div>
                  <div className="flex items-center justify-end px-4 py-1.5 font-mono font-bold text-xs text-neutral-900">
                    {formatUsd(invoice.subtotal_usd)}
                  </div>
                </div>
              );
            })}

            {!data.invoices.length ? (
              <div className="grid grid-cols-[1fr_150px] min-h-8">
                <div className="flex items-center border-neutral-800 border-r px-4 py-2 text-neutral-500 italic">
                  No chargeable customer bookings recorded for this month.
                </div>
                <div className="flex items-center justify-end px-4 py-2 font-mono text-neutral-400">
                  $0.00
                </div>
              </div>
            ) : null}

            {/* Empty Ruled Lines like in physical voucher paper */}
            <div className="grid grid-cols-[1fr_150px] h-7">
              <div className="border-neutral-800 border-r px-4" />
              <div className="px-4" />
            </div>

            <div className="grid grid-cols-[1fr_150px] h-7">
              <div className="border-neutral-800 border-r px-4" />
              <div className="px-4" />
            </div>

            {/* Service Charge Row */}
            <div className="grid grid-cols-[1fr_150px] min-h-8">
              <div className="flex items-center justify-center border-neutral-800 border-r px-4 py-1.5 font-serif font-medium text-neutral-700 italic">
                Service charge 10%
              </div>
              <div className="flex items-center justify-end px-4 py-1.5 font-mono text-neutral-800">
                {formatUsd(service)}
              </div>
            </div>

            {/* Tax / GST Row */}
            <div className="grid grid-cols-[1fr_150px] min-h-8">
              <div className="flex items-center justify-center border-neutral-800 border-r px-4 py-1.5 font-serif font-medium text-neutral-700 italic">
                Tourism GST (TGST) 17%
              </div>
              <div className="flex items-center justify-end px-4 py-1.5 font-mono text-neutral-800">
                {formatUsd(tax)}
              </div>
            </div>

            {/* Total Row */}
            <div className="grid grid-cols-[1fr_150px] border-neutral-800 border-t-2 bg-neutral-50 font-bold text-xs uppercase">
              <div className="flex items-center border-neutral-800 border-r px-4 py-2.5 font-serif tracking-wider text-neutral-900">
                TOTAL (USD)
              </div>
              <div className="flex items-center justify-end px-4 py-2.5 font-mono text-sm text-neutral-950">
                {formatUsd(customerTotal)}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Signatures Section: 3 Signature Columns */}
      <footer className="mt-8 pt-4">
        <div className="grid grid-cols-2 gap-16 items-end text-center max-w-xl mx-auto w-full">
          {/* 1. Prepared By */}
          <div className="flex flex-col items-center">
            <div className="flex h-24 w-full flex-col items-center justify-end pb-1">
              {data.signature ? (
                <div className="relative h-20 w-44">
                  <Image
                    unoptimized
                    fill
                    src={data.signature.signature_data_url}
                    alt={`Signature of ${data.signature.signer_name}`}
                    className="object-contain object-bottom"
                  />
                </div>
              ) : (
                <span className="font-serif font-medium text-neutral-400 text-xs italic">
                  Awaiting staff signature
                </span>
              )}
            </div>
            <div className="w-full border-neutral-900 border-b" />
            <p className="mt-2 font-serif font-bold text-xs uppercase tracking-wider text-neutral-900">
              PREPARED BY:
            </p>
            <p className="text-[10px] text-neutral-500 font-medium">
              {data.signature?.signer_name ?? "Responsible Staff"}
            </p>
          </div>

          {/* 2. Approved By */}
          <div className="flex flex-col items-center">
            <div className="flex h-24 w-full flex-col items-center justify-end pb-1">
              {data.submission?.admin_signature_data_url ? (
                <div className="relative h-20 w-44">
                  <Image
                    unoptimized
                    fill
                    src={data.submission.admin_signature_data_url}
                    alt={`Signature of ${data.submission.admin_signer_name ?? "Admin"}`}
                    className="object-contain object-bottom"
                  />
                </div>
              ) : (
                <span className="font-serif font-medium text-neutral-400 text-xs italic">
                  {data.submission?.status === "reviewed" ? "Approved by Admin" : "Awaiting Admin approval"}
                </span>
              )}
            </div>
            <div className="w-full border-neutral-900 border-b" />
            <p className="mt-2 font-serif font-bold text-xs uppercase tracking-wider text-neutral-900">
              APPROVED BY:
            </p>
            <p className="text-[10px] text-neutral-500 font-medium">
              {data.submission?.admin_signer_name ?? (data.submission?.status === "reviewed" ? "Admin Ephemeris" : "Resort Management")}
            </p>
          </div>
        </div>

        {/* Small Voucher Footer Disclaimer */}
        <div className="mt-6 flex justify-between items-center border-neutral-200 border-t pt-2 text-[10px] text-neutral-400">
          <span>Period: {monthLabel(data.month)}</span>
          <span>SpaceCat ASTROTOURISM · Monthly Customer Invoice Register</span>
        </div>
      </footer>
    </article>
  );
}

export function MonthlyInvoiceSubmissionPanel({ invoices, pending, readOnly, signatures, submissions, workflows, onPreviewChange, onPrint, onSign, onSubmit }: {
  invoices: InvoiceRow[];
  pending: boolean;
  readOnly: boolean;
  signatures: MonthlyInvoiceStaffSignature[];
  submissions: MonthlyInvoiceSubmission[];
  workflows: PaymentWorkflowRow[];
  onPreviewChange: (data: MonthlyStaffInvoiceData) => void;
  onPrint: (data: MonthlyStaffInvoiceData, pdf: boolean) => void;
  onSign: (month: string, signature: MonthlyInvoiceStaffSignature | null) => void;
  onSubmit: (month: string) => void;
}) {
  const latestMonth = workflows.map((workflow) => workflow.source_date?.slice(0, 7) ?? "").filter(Boolean).sort().at(-1) ?? new Date().toISOString().slice(0, 7);
  const [month, setMonth] = React.useState(latestMonth);
  const monthlyWorkflows = React.useMemo(
    () => workflows.filter((workflow) => workflow.source_date?.slice(0, 7) === month),
    [month, workflows],
  );
  const rows = React.useMemo(
    () => monthlyWorkflows.map((workflow) => ({ workflow, invoice: workflow.invoice_id ? (invoices.find((invoice) => invoice.id === workflow.invoice_id) ?? null) : null })),
    [invoices, monthlyWorkflows],
  );
  const invoiceRows = React.useMemo(() => rows.flatMap((row) => (row.invoice ? [row.invoice] : [])), [rows]);
  const missingInvoiceCount = rows.length - invoiceRows.length;
  const resortName = monthlyWorkflows[0]?.context_name ?? "Assigned resort";
  const signature = signatures.find((item) => item.period_start.slice(0, 7) === month) ?? null;
  const submission = submissions.find((item) => item.period_start.slice(0, 7) === month);
  const data = React.useMemo(
    () => ({ month, resortName, invoices: invoiceRows, signature, submission }),
    [invoiceRows, month, resortName, signature, submission],
  );
  const total = invoiceRows.reduce((sum, invoice) => sum + invoice.total_usd, 0);
  const complete = rows.length > 0 && missingInvoiceCount === 0 && Boolean(signature);

  React.useEffect(() => {
    onPreviewChange(data);
  }, [data, onPreviewChange]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Monthly invoice submission</CardTitle>
              {submission ? (
                <Badge
                  variant={submission.status === "reviewed" ? "default" : "outline"}
                  className={
                    submission.status === "reviewed"
                      ? "bg-emerald-600 text-white font-medium hover:bg-emerald-600 border-0"
                      : "border-amber-500/40 text-amber-500 bg-amber-500/10 font-medium"
                  }
                >
                  {submission.status === "reviewed" ? "✓ Approved & Signed by Admin" : "Menunggu Review Admin"}
                </Badge>
              ) : null}
            </div>
            <CardDescription className="mt-1">Choose a month to accumulate every customer booking into one invoice register, then sign it and send it to Admin.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Input className="sm:w-44" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <Button type="button" variant="outline" disabled={readOnly || !rows.length || submission?.status === "reviewed"} onClick={() => onSign(month, signature)}><PenLine data-icon="inline-start" />{signature ? "Sign again" : "Staff signature"}</Button>
            <Button type="button" variant="outline" disabled={!invoiceRows.length} onClick={() => onPrint(data, false)}><Printer data-icon="inline-start" />Print</Button>
            <Button type="button" variant="outline" disabled={!invoiceRows.length} onClick={() => onPrint(data, true)}><Download data-icon="inline-start" />PDF</Button>
            <Button type="button" disabled={readOnly || pending || !complete || submission?.status === "reviewed"} onClick={() => onSubmit(month)}><SubmissionActionIcon pending={pending} resubmission={Boolean(submission)} />{submission ? "Resend to Admin" : "Send to Admin"}</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3"><p className="text-muted-foreground text-xs">Bookings this month</p><p className="mt-1 font-semibold text-xl">{rows.length}</p></div>
          <div className="rounded-xl border p-3"><p className="text-muted-foreground text-xs">Generated invoices</p><p className="mt-1 font-semibold text-xl">{invoiceRows.length}/{rows.length}</p></div>
          <div className="rounded-xl border p-3"><p className="text-muted-foreground text-xs">Customer total</p><p className="mt-1 font-semibold text-xl">{formatUsd(total)}</p></div>
        </div>

        {missingInvoiceCount || !signature ? (
          <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-amber-100 text-sm">
            {missingInvoiceCount ? `${missingInvoiceCount} booking${missingInvoiceCount === 1 ? " does" : "s do"} not have a paid invoice yet. ` : ""}
            {!signature ? "The responsible staff signature is still required. " : ""}Complete the monthly register before sending it to Admin.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-1 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100 text-sm sm:flex-row sm:items-center sm:justify-between"><span>Signed by {signature.signer_name}, the staff member responsible for this month.</span><span className="text-xs">{formatDateTime(signature.signed_at)}</span></div>
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-[#041530]/60">
          <table className="w-full text-sm">
            <thead className="border-cyan-400/20 border-b bg-[#08234c] text-left text-cyan-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Invoice</th>
                <th className="px-3 py-2.5 font-semibold">Guest</th>
                <th className="px-3 py-2.5 font-semibold">Room</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {rows.map(({ invoice, workflow }) => (
                <tr key={workflow.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2.5">
                    <p className="font-mono font-semibold text-slate-100 text-xs">
                      {invoice?.invoice_number ?? "Invoice pending"}
                    </p>
                    <p className="max-w-[200px] truncate text-slate-400 text-xs">
                      {invoice?.line_items[0]?.description ?? workflow.reference}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-100">{workflow.recipient_name}</p>
                    {invoice?.recipient_phone || (invoice ? snapshotText(invoice, "guest_phone") : null) ? (
                      <p className="font-mono text-[11px] text-slate-400">
                        {invoice?.recipient_phone || (invoice ? snapshotText(invoice, "guest_phone") : "")}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium font-mono text-slate-300 text-xs">
                      {invoice ? snapshotText(invoice, "room_number") || "—" : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-300 text-sm tabular-nums">
                    {invoice ? formatUsd(invoice.total_usd) : "—"}
                  </td>
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No chargeable customer bookings for this month.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {submission ? <p className="mt-3 text-muted-foreground text-xs">Last sent by {submission.submitted_by_name} on {formatDateTime(submission.submitted_at)}{submission.reviewed_at ? ` · Reviewed by ${submission.reviewed_by_name ?? "Admin"}` : ""}.</p> : null}
      </CardContent>
    </Card>
  );
}
