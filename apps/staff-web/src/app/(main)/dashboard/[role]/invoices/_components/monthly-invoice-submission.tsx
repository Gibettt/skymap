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

export interface MonthlyStaffInvoiceData {
  month: string;
  resortName: string;
  invoices: InvoiceRow[];
  signature: MonthlyInvoiceStaffSignature | null;
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
  const resortClaim = Math.round((subtotal * 0.5 + service) * 100) / 100;

  return (
    <article data-print-paper data-monthly-staff-invoice className="flex min-h-[1056px] w-[816px] flex-col bg-white px-10 py-10 font-mono text-neutral-950">
      <header className="flex items-start justify-between border-neutral-300 border-b pb-7">
        <div className="flex items-center gap-4">
          <Image
            unoptimized
            priority
            src="/spacecat-astrotourism-logo.jpg"
            alt="SpaceCat ASTROTOURISM"
            width={56}
            height={56}
            className="size-14 rounded-2xl object-cover shadow-xs"
          />
          <div>
            <p className="font-semibold text-xs uppercase tracking-[0.25em]">SpaceCat ASTROTOURISM</p>
            <h1 className="mt-1 font-semibold text-3xl">Monthly Customer Invoice Register</h1>
            <p className="mt-1 text-neutral-600 text-sm">{monthLabel(data.month)}</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">Resort</p>
          <p>{data.resortName}</p>
          <p>{data.invoices.length} customer invoices</p>
        </div>
      </header>

      <section className="mt-8 overflow-hidden border border-neutral-300 text-[10px]">
        <div className="grid grid-cols-[1fr_1fr_58px_42px_42px_72px_72px_82px] bg-neutral-200 px-2 py-3 font-semibold uppercase">
          <span>Invoice / package</span><span>Guest</span><span>Room</span>
          <span className="text-right">Pax</span><span className="text-right">Kids</span>
          <span className="text-right">Net</span><span className="text-right">Service</span>
          <span className="text-right">Customer total</span>
        </div>
        {data.invoices.map((invoice) => {
          const adults = snapshotNumber(invoice, "adult_count");
          const kids = snapshotNumber(invoice, "child_count");
          return (
            <div key={invoice.id} className="grid break-inside-avoid grid-cols-[1fr_1fr_58px_42px_42px_72px_72px_82px] border-neutral-200 border-t px-2 py-3">
              <span>{invoice.invoice_number}<small className="block text-neutral-500">{[...new Set(invoice.line_items.map((item) => item.description))].join(", ")}</small></span>
              <span>{invoice.recipient_name}</span>
              <span>{snapshotText(invoice, "room_number") || "—"}</span>
              <span className="text-right">{adults + kids}</span>
              <span className="text-right">{kids}</span>
              <span className="text-right">{formatUsd(invoice.subtotal_usd)}</span>
              <span className="text-right">{formatUsd(invoice.service_charge_usd)}</span>
              <span className="text-right font-semibold">{formatUsd(invoice.total_usd)}</span>
            </div>
          );
        })}
      </section>

      <section className="mt-8 ml-auto w-80 space-y-2 text-sm">
        <div className="flex justify-between"><span>Net amount</span><span>{formatUsd(subtotal)}</span></div>
        <div className="flex justify-between"><span>Service charge</span><span>{formatUsd(service)}</span></div>
        <div className="flex justify-between"><span>Customer GST</span><span>{formatUsd(tax)}</span></div>
        <div className="flex justify-between"><span>Customer total</span><span>{formatUsd(customerTotal)}</span></div>
        <div className="flex justify-between border-neutral-900 border-y-2 py-3 font-semibold"><span>RESORT CLAIM</span><span>{formatUsd(resortClaim)}</span></div>
        <p className="text-[10px] text-neutral-500">50% net amount + 100% service charge. GST excluded from resort claim.</p>
      </section>

      <footer className="mt-auto flex justify-end border-neutral-300 border-t pt-10">
        <div className="flex w-60 flex-col items-end text-right text-xs">
          <p className="mb-2 text-neutral-500 uppercase tracking-wider">Responsible Internal Staff</p>
          <div className="relative h-20 w-52">
            {data.signature ? <Image unoptimized fill src={data.signature.signature_data_url} alt={`Signature of ${data.signature.signer_name}`} className="object-contain object-right-bottom" /> : null}
          </div>
          <p className="min-w-52 border-neutral-400 border-t pt-1 font-semibold text-neutral-900">{data.signature?.signer_name ?? "Awaiting staff signature"}</p>
          <p className="mt-1 text-neutral-500">{data.signature ? `Signed ${formatDateTime(data.signature.signed_at)}` : "Internal Staff in charge"}</p>
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
  const data = React.useMemo(
    () => ({ month, resortName, invoices: invoiceRows, signature }),
    [invoiceRows, month, resortName, signature],
  );
  const submission = submissions.find((item) => item.period_start.slice(0, 7) === month);
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
            <div className="flex flex-wrap items-center gap-2"><CardTitle>Monthly invoice submission</CardTitle>{submission ? <Badge variant={submission.status === "reviewed" ? "default" : "outline"}>{submission.status}</Badge> : null}</div>
            <CardDescription className="mt-1">Choose a month to accumulate every customer booking into one invoice register, then sign it as the responsible Internal Staff member.</CardDescription>
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
            {!signature ? "The responsible Internal Staff signature is still required. " : ""}Complete the monthly register before sending it to Admin.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-1 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100 text-sm sm:flex-row sm:items-center sm:justify-between"><span>Signed by {signature.signer_name}, the Internal Staff member responsible for this month.</span><span className="text-xs">{formatDateTime(signature.signed_at)}</span></div>
        )}

        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-white/5 text-left text-muted-foreground text-xs uppercase"><tr><th className="p-3">Invoice</th><th className="p-3">Guest</th><th className="p-3">Room</th><th className="p-3">Status</th><th className="p-3 text-right">Total</th></tr></thead>
            <tbody>
              {rows.map(({ invoice, workflow }) => (
                <tr key={workflow.id} className="border-white/10 border-t">
                  <td className="p-3"><p className="font-medium">{invoice?.invoice_number ?? "Invoice pending"}</p><p className="text-muted-foreground text-xs">{invoice?.line_items[0]?.description ?? workflow.reference}</p></td>
                  <td className="p-3">{workflow.recipient_name}</td><td className="p-3">{invoice ? snapshotText(invoice, "room_number") || "—" : "—"}</td>
                  <td className="p-3"><Badge variant={invoice ? "default" : "outline"}>{invoice ? "Ready" : "Payment pending"}</Badge></td>
                  <td className="p-3 text-right font-medium">{invoice ? formatUsd(invoice.total_usd) : "—"}</td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No chargeable customer bookings for this month.</td></tr> : null}
            </tbody>
          </table>
        </div>
        {submission ? <p className="mt-3 text-muted-foreground text-xs">Last sent by {submission.submitted_by_name} on {formatDateTime(submission.submitted_at)}{submission.reviewed_at ? ` · Reviewed by ${submission.reviewed_by_name ?? "Admin"}` : ""}.</p> : null}
      </CardContent>
    </Card>
  );
}
