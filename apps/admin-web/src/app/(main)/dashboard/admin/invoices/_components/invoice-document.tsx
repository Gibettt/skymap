import type { InvoiceRow } from "../../_lib/admin-data";
import { formatUsd, titleCase } from "../../_lib/format";

export const INVOICE_PAPER_WIDTH = 816;
export const INVOICE_PAPER_HEIGHT = 1056;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function snapshotText(invoice: InvoiceRow, key: string) {
  const value = invoice.source_snapshot[key];
  return value == null || value === "" ? null : String(value);
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceRow }) {
  const payout = invoice.invoice_type === "staff_payout";
  const paymentDate = payout
    ? snapshotText(invoice, "paid_at")
    : (snapshotText(invoice, "payment_confirmed_at") ?? invoice.issued_at);
  const paymentReference = snapshotText(invoice, "payment_reference");
  const sourceLabel = payout
    ? `Payout ${invoice.source_reference.slice(-8).toUpperCase()}`
    : `Booking ${invoice.source_reference}`;

  return (
    <article
      style={{ height: INVOICE_PAPER_HEIGHT, width: INVOICE_PAPER_WIDTH }}
      data-print-paper
      data-invoice-document
      className="relative flex flex-col gap-24 bg-neutral-50 px-12.25 py-11 font-mono text-neutral-950"
    >
      <header className="flex flex-col gap-10">
        <div className="grid grid-cols-2 items-start gap-14">
          <svg className="size-12" viewBox="0 0 48 48" aria-hidden="true">
            <rect width="20" height="20" rx="3" fill="currentColor" />
            <rect x="28" width="20" height="20" rx="3" fill="currentColor" />
            <rect y="28" width="20" height="20" rx="3" fill="currentColor" />
            <rect x="28" y="28" width="20" height="20" rx="3" fill="currentColor" />
          </svg>
          <h2 className="text-4xl uppercase tracking-widest">{payout ? "Payout Invoice" : "Invoice"}</h2>
        </div>

        <section className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <div>
            <p>Reference: {invoice.invoice_number}</p>
            <p>Issued: {formatDate(invoice.issued_at)}</p>
            <p>Payment date: {formatDate(paymentDate)}</p>
          </div>
          <div>
            <p>Payment details</p>
            <p>{invoice.payment_method ?? "Not recorded"}</p>
            {paymentReference ? <p>Reference: {paymentReference}</p> : null}
            <p>{sourceLabel}</p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <div>
            <p className="mb-4 font-semibold uppercase">From</p>
            <p>SpaceCat ASTROTOURISM Administration</p>
            <p>Maldives</p>
            <p>admin@ephemeris.id</p>
          </div>
          <div>
            <p className="mb-4 font-semibold uppercase">{payout ? "Paid to" : "Bill to"}</p>
            <p>{invoice.recipient_name}</p>
            {invoice.recipient_detail ? <p>{invoice.recipient_detail}</p> : null}
            {invoice.recipient_email ? <p>{invoice.recipient_email}</p> : null}
            {invoice.recipient_phone ? <p>{invoice.recipient_phone}</p> : null}
          </div>
        </section>
      </header>

      <div className="flex flex-col gap-5">
        <section className="text-sm">
          <div className="grid grid-cols-[1fr_74px_116px_116px] bg-stone-200 px-3 py-3 font-semibold uppercase">
            <span>Description</span>
            <span className="text-right">Units</span>
            <span className="text-right">Unit cost</span>
            <span className="text-right">Line total</span>
          </div>
          {invoice.line_items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_74px_116px_116px] border-[oklch(0.86_0_0)] border-b px-3 py-4"
            >
              <div className="min-w-0">
                <p>{item.description}</p>
                {item.detail ? <p className="text-neutral-500 text-xs">{item.detail}</p> : null}
              </div>
              <span className="text-right">{item.quantity}</span>
              <span className="text-right">{formatUsd(item.unit_price_usd)}</span>
              <span className="text-right">{formatUsd(item.amount_usd)}</span>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-2 gap-14 text-sm leading-relaxed">
          <section className="col-start-2 flex flex-col gap-2">
            <div>
              <div className="flex justify-between gap-8">
                <span>Net amount</span>
                <span>{formatUsd(invoice.subtotal_usd)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>Service charge</span>
                <span>{formatUsd(invoice.service_charge_usd)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span>
                  {invoice.tax_label}
                  {invoice.tax_rate_percent > 0 ? ` (${invoice.tax_rate_percent}%)` : ""}
                </span>
                <span>{formatUsd(invoice.tax_usd)}</span>
              </div>
            </div>
            <div className="border-current border-y-2 py-3">
              <div className="flex justify-between gap-8">
                <span className="font-semibold uppercase">Amount paid</span>
                <span className="font-semibold">{formatUsd(invoice.total_usd)}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <footer className="absolute right-12.25 bottom-11 left-12.25 grid grid-cols-2 gap-14 text-neutral-500 text-sm leading-relaxed">
        <div>
          <p>admin@ephemeris.id</p>
          <p>SpaceCat ASTROTOURISM Administration</p>
        </div>
        <div>
          <p>{payout ? "Payout completed and recorded." : "Customer payment confirmed and recorded."}</p>
          <p>
            Issued by {invoice.issuer_name ?? "SpaceCat ASTROTOURISM Admin"} · {titleCase(invoice.status)}
          </p>
        </div>
      </footer>
    </article>
  );
}
