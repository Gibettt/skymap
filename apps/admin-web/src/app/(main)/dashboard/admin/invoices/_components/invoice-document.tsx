"use client";

import * as React from "react";
import Image from "next/image";
import { PenLine } from "lucide-react";

import type { InvoiceRow } from "../../_lib/admin-data";
import { formatUsd } from "../../_lib/format";

export const INVOICE_PAPER_WIDTH = 816;
export const INVOICE_PAPER_HEIGHT = 1056;

function formatVoucherDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

function snapshotText(invoice: InvoiceRow, key: string) {
  const value = invoice.source_snapshot[key];
  return value == null || value === "" ? null : String(value);
}

function getSerialNo(invoice: InvoiceRow) {
  if (!invoice.invoice_number) return "4032";
  const parts = invoice.invoice_number.split("-");
  const last = parts[parts.length - 1];
  return last ? last.slice(-4) : "4032";
}

export function InvoiceDocument({
  invoice,
  onSignGuest,
  onSignStaff,
  staffRole,
  currentStaffName,
}: {
  invoice: InvoiceRow;
  onSignGuest?: () => void;
  onSignStaff?: () => void;
  staffRole?: string;
  currentStaffName?: string;
}) {
  const paymentDate = snapshotText(invoice, "payment_confirmed_at") ?? invoice.issued_at;
  const resortName = snapshotText(invoice, "resort_name");
  const roomNumber = snapshotText(invoice, "room_number");
  const packageName = snapshotText(invoice, "package_name");
  const guestPhone =
    invoice.recipient_phone ||
    snapshotText(invoice, "guest_phone") ||
    snapshotText(invoice, "phone");
  const serialNo = getSerialNo(invoice);
  const effectiveStaffName =
    invoice.staff_signer_name ||
    snapshotText(invoice, "staff_name") ||
    currentStaffName ||
    (staffRole === "external" ? "External Staff" : "Internal Staff");
  const effectiveRoleLabel =
    staffRole === "external" || snapshotText(invoice, "staff_role") === "external"
      ? "External Staff"
      : "Internal Staff";

  const primaryItem = invoice.line_items[0];
  const categoryTitle = packageName || primaryItem?.description || "Kids Club Classes";

  return (
    <article
      style={{ height: INVOICE_PAPER_HEIGHT, width: INVOICE_PAPER_WIDTH }}
      data-print-paper
      data-invoice-document
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
            {resortName ? `${resortName.toUpperCase()} · MALDIVES` : "MALDIVES MAAMUNAGAU RESORT"}
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
            <span className="min-w-24 font-serif font-medium text-neutral-700">Guest Name :</span>
            <span className="font-mono font-bold text-neutral-900 uppercase tracking-wide">
              {invoice.recipient_name}
            </span>
          </div>
          <div className="flex items-baseline gap-2 border-neutral-300 border-b pb-1">
            <span className="min-w-20 font-serif font-medium text-neutral-700">Serial No :</span>
            <span className="font-mono font-bold text-base text-red-600 tracking-wider">
              {serialNo}
            </span>
          </div>

          <div className="flex items-baseline gap-2 border-neutral-300 border-b pb-1">
            <span className="min-w-24 font-serif font-medium text-neutral-700">Room No :</span>
            <span className="font-mono font-semibold text-neutral-900">
              {roomNumber ? `V ${roomNumber}` : "V —"}
            </span>
          </div>
          <div className="flex items-baseline gap-2 border-neutral-300 border-b pb-1">
            <span className="min-w-20 font-serif font-medium text-neutral-700">Date :</span>
            <span className="font-mono font-semibold text-neutral-900">
              {formatVoucherDate(paymentDate)}
            </span>
          </div>
        </section>

        {/* Category Header above Table */}
        <div className="mt-4 flex justify-end px-1">
          <span className="font-serif font-semibold text-neutral-800 text-xs italic tracking-wide">
            {categoryTitle}
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
            {invoice.line_items.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_150px] min-h-8">
                <div className="flex items-center border-neutral-800 border-r px-4 py-1.5 font-serif font-bold text-xs tracking-wide text-neutral-900">
                  {item.description || packageName || "Stargazing Experience"}
                </div>
                <div className="flex items-center justify-end px-4 py-1.5 font-mono font-bold text-xs text-neutral-900">
                  {formatUsd(item.amount_usd)}
                </div>
              </div>
            ))}

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
                {formatUsd(invoice.service_charge_usd)}
              </div>
            </div>

            {/* Tax / GST Row */}
            <div className="grid grid-cols-[1fr_150px] min-h-8">
              <div className="flex items-center justify-center border-neutral-800 border-r px-4 py-1.5 font-serif font-medium text-neutral-700 italic">
                {invoice.tax_label} {invoice.tax_rate_percent}%
              </div>
              <div className="flex items-center justify-end px-4 py-1.5 font-mono text-neutral-800">
                {formatUsd(invoice.tax_usd)}
              </div>
            </div>

            {/* Total Row */}
            <div className="grid grid-cols-[1fr_150px] border-neutral-800 border-t-2 bg-neutral-50 font-bold text-xs uppercase">
              <div className="flex items-center border-neutral-800 border-r px-4 py-2.5 font-serif tracking-wider text-neutral-900">
                TOTAL (USD)
              </div>
              <div className="flex items-center justify-end px-4 py-2.5 font-mono text-sm text-neutral-950">
                {formatUsd(invoice.total_usd)}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Signatures Section: 3 Signature Columns */}
      <footer className="mt-8 pt-4">
        <div className="grid grid-cols-3 gap-8 items-end text-center">
          {/* 1. Guest Signature */}
          <div className="flex flex-col items-center">
            <div
              className={`relative flex h-24 w-full flex-col items-center justify-end pb-1 ${
                onSignGuest
                  ? "group cursor-pointer rounded-lg border border-transparent transition-all hover:border-violet-300 hover:bg-violet-50/50"
                  : ""
              }`}
              onClick={onSignGuest}
              title={onSignGuest ? "Klik untuk membubuhkan tanda tangan tamu" : undefined}
            >
              {invoice.signature_data_url ? (
                <div className="relative h-20 w-44">
                  <Image
                    unoptimized
                    fill
                    src={invoice.signature_data_url}
                    alt={`Signature of ${invoice.signature_signer_name ?? invoice.recipient_name}`}
                    className="object-contain object-bottom"
                  />
                </div>
              ) : onSignGuest ? (
                <div className="mb-2 flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-100/60 px-3 py-1 font-medium text-violet-700 text-xs shadow-xs transition-transform group-hover:scale-105">
                  <PenLine className="size-3.5" />
                  <span>Guest Signature</span>
                </div>
              ) : (
                <div className="h-16" />
              )}
            </div>
            <div className="w-full border-neutral-900 border-b" />
            <p className="mt-2 font-serif font-bold text-xs uppercase tracking-wider text-neutral-900">
              Guest Signature
            </p>
            {invoice.signature_signer_name ? (
              <p className="text-[10px] text-neutral-500">{invoice.signature_signer_name}</p>
            ) : null}
          </div>

          {/* 2. Prepared By */}
          <div className="flex flex-col items-center">
            <div
              className={`relative flex h-24 w-full flex-col items-center justify-end pb-1 ${
                onSignStaff
                  ? "group cursor-pointer rounded-lg border border-transparent transition-all hover:border-violet-300 hover:bg-violet-50/50"
                  : ""
              }`}
              onClick={onSignStaff}
              title={onSignStaff ? "Click to provide staff signature" : undefined}
            >
              {invoice.staff_signature_data_url ? (
                <div className="relative h-20 w-44">
                  <Image
                    unoptimized
                    fill
                    src={invoice.staff_signature_data_url}
                    alt={`Signature of ${invoice.staff_signer_name ?? effectiveStaffName}`}
                    className="object-contain object-bottom"
                  />
                </div>
              ) : onSignStaff ? (
                <div className="mb-2 flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-100/60 px-3 py-1 font-medium text-violet-700 text-xs shadow-xs transition-transform group-hover:scale-105">
                  <PenLine className="size-3.5" />
                  <span>Staff Signature</span>
                </div>
              ) : (
                <span className="font-serif font-medium text-neutral-700 text-xs italic">
                  {effectiveStaffName}
                </span>
              )}
            </div>
            <div className="w-full border-neutral-900 border-b" />
            <p className="mt-2 font-serif font-bold text-xs uppercase tracking-wider text-neutral-900">
              Prepared By:
            </p>
            <p className="text-[10px] text-neutral-500 font-medium">
              {effectiveStaffName} · {effectiveRoleLabel}
            </p>
          </div>

          {/* 3. Approved By */}
          <div className="flex flex-col items-center">
            <div className="flex h-24 w-full flex-col items-center justify-end pb-2">
              <span className="font-serif font-medium text-neutral-400 text-xs italic">
                Resort Duty Manager
              </span>
            </div>
            <div className="w-full border-neutral-900 border-b" />
            <p className="mt-2 font-serif font-bold text-xs uppercase tracking-wider text-neutral-900">
              Approved By:
            </p>
            <p className="text-[10px] text-neutral-500">Resort Management</p>
          </div>
        </div>

        {/* Small Voucher Footer Disclaimer */}
        <div className="mt-6 flex justify-between items-center border-neutral-200 border-t pt-2 text-[10px] text-neutral-400">
          <span>Ref: {invoice.invoice_number}</span>
          <span>SpaceCat ASTROTOURISM · Customer Payment Voucher</span>
        </div>
      </footer>
    </article>
  );
}
