import Image from "next/image";

import type { MonthlyInvoiceSubmissionRow } from "../../_lib/admin-data";
import { formatUsd } from "../../_lib/format";

export const SUBMITTED_MONTHLY_PAPER_WIDTH = 816;
export const SUBMITTED_MONTHLY_PAPER_HEIGHT = 1056;

function snapshotText(invoice: MonthlyInvoiceSubmissionRow["invoices"][number], key: string) {
  const value = invoice.source_snapshot[key];
  return value == null || value === "" ? "" : String(value);
}

function snapshotNumber(invoice: MonthlyInvoiceSubmissionRow["invoices"][number], key: string) {
  const value = Number(invoice.source_snapshot[key]);
  return Number.isFinite(value) ? value : 0;
}

function monthLabel(value: string) {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function SubmittedMonthlyInvoiceDocument({ submission }: { submission: MonthlyInvoiceSubmissionRow }) {
  const subtotal = submission.invoices.reduce((total, invoice) => total + invoice.subtotal_usd, 0);
  const service = submission.invoices.reduce((total, invoice) => total + invoice.service_charge_usd, 0);
  const tax = submission.invoices.reduce((total, invoice) => total + invoice.tax_usd, 0);
  const customerTotal = submission.invoices.reduce((total, invoice) => total + invoice.total_usd, 0);
  const resortClaim = Math.round((subtotal * 0.5 + service) * 100) / 100;

  return (
    <article
      data-print-paper
      data-submitted-monthly-invoice
      className="flex min-h-[1056px] w-[816px] flex-col bg-white px-10 py-10 font-mono text-neutral-950"
    >
      <header className="flex items-start justify-between border-neutral-300 border-b pb-7">
        <div>
          <p className="font-semibold text-xs uppercase tracking-[0.25em]">SpaceCat ASTROTOURISM</p>
          <h1 className="mt-2 font-semibold text-3xl">Monthly Customer Invoice Register</h1>
          <p className="mt-2 text-neutral-600 text-sm">{monthLabel(submission.period_start)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">Resort</p>
          <p>{submission.resort_name}</p>
          <p>{submission.invoices.length} customer invoices</p>
        </div>
      </header>

      <section className="mt-8 overflow-hidden border border-neutral-300 text-[10px]">
        <div className="grid grid-cols-[1fr_1fr_58px_42px_42px_72px_72px_82px] bg-neutral-200 px-2 py-3 font-semibold uppercase">
          <span>Invoice / package</span>
          <span>Guest</span>
          <span>Room</span>
          <span className="text-right">Pax</span>
          <span className="text-right">Kids</span>
          <span className="text-right">Net</span>
          <span className="text-right">Service</span>
          <span className="text-right">Customer total</span>
        </div>
        {submission.invoices.map((invoice) => {
          const adults = snapshotNumber(invoice, "adult_count");
          const kids = snapshotNumber(invoice, "child_count");
          return (
            <div
              key={invoice.id}
              className="grid break-inside-avoid grid-cols-[1fr_1fr_58px_42px_42px_72px_72px_82px] border-neutral-200 border-t px-2 py-3"
            >
              <span>
                {invoice.invoice_number}
                <small className="block text-neutral-500">
                  {[...new Set(invoice.line_items.map((item) => item.description))].join(", ")}
                </small>
              </span>
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
        <div className="flex justify-between border-neutral-900 border-y-2 py-3 font-semibold">
          <span>RESORT CLAIM</span><span>{formatUsd(resortClaim)}</span>
        </div>
        <p className="text-[10px] text-neutral-500">
          50% net amount + 100% service charge. GST excluded from resort claim.
        </p>
      </section>

      <footer className="mt-auto flex justify-end border-neutral-300 border-t pt-10">
        <div className="flex w-60 flex-col items-end text-right text-xs">
          <p className="mb-2 text-neutral-500 uppercase tracking-wider">Responsible Internal Staff</p>
          <div className="relative h-20 w-52">
            {submission.staff_signature_data_url ? (
              <Image
                unoptimized
                fill
                src={submission.staff_signature_data_url}
                alt={`Signature of ${submission.staff_signer_name ?? submission.submitted_by_name}`}
                className="object-contain object-right-bottom"
              />
            ) : null}
          </div>
          <p className="min-w-52 border-neutral-400 border-t pt-1 font-semibold text-neutral-900">
            {submission.staff_signer_name ?? submission.submitted_by_name}
          </p>
          <p className="mt-1 text-neutral-500">Signed {formatDateTime(submission.staff_signed_at)}</p>
        </div>
      </footer>
    </article>
  );
}
