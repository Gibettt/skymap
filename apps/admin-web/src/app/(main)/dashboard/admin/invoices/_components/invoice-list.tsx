"use client";

import * as React from "react";

import { CheckCircle2, Eye, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { InvoiceRow, MonthlyInvoiceSubmissionRow } from "../../_lib/admin-data";
import { formatUsd } from "../../_lib/format";

function snapshotText(invoice: InvoiceRow, key: string) {
  const value = invoice.source_snapshot[key];
  return value == null ? "" : String(value);
}

export function InvoiceList({
  invoices,
  monthlySubmissions = [],
  pendingId,
  onOpen,
  onOpenMonthly,
  onToggleResortStatus,
}: {
  invoices: InvoiceRow[];
  monthlySubmissions?: MonthlyInvoiceSubmissionRow[];
  pendingId: string | null;
  onOpen: (invoice: InvoiceRow) => void;
  onOpenMonthly?: (submission: MonthlyInvoiceSubmissionRow) => void;
  onToggleResortStatus: (invoice: InvoiceRow) => void;
}) {
  const [search, setSearch] = React.useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const monthlyInvoiceItems = React.useMemo(() => {
    return monthlySubmissions
      .filter((s) => s.status === "reviewed" || Boolean(s.admin_signature_data_url))
      .map((s): InvoiceRow & { monthlySubmissionRaw?: MonthlyInvoiceSubmissionRow } => {
        const periodKey = s.period_start.slice(0, 7);
        const code = `INV-MON-${periodKey.replace("-", "")}-${s.resort_name.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase()}`;
        const total = s.invoices.reduce((sum, inv) => sum + inv.total_usd, 0);
        const subtotal = s.invoices.reduce((sum, inv) => sum + inv.subtotal_usd, 0);
        const service = s.invoices.reduce((sum, inv) => sum + inv.service_charge_usd, 0);
        const tax = s.invoices.reduce((sum, inv) => sum + inv.tax_usd, 0);

        return {
          id: s.id,
          invoice_number: code,
          invoice_type: "monthly" as const,
          status: "issued" as const,
          booking_id: null,
          payout_request_id: null,
          recipient_name: `${s.resort_name} (Resort Claim)`,
          recipient_email: null,
          recipient_phone: null,
          recipient_detail: `Period: ${periodKey} · Submitted by ${s.submitted_by_name}`,
          payment_method: "Resort claim",
          currency: "USD",
          issued_at: s.reviewed_at ?? s.submitted_at,
          due_date: null,
          subtotal_usd: subtotal,
          service_charge_usd: service,
          tax_usd: tax,
          tax_label: "Tourism GST (TGST)",
          tax_rate_percent: 17,
          total_usd: total,
          line_items: [],
          source_snapshot: {
            resort_name: s.resort_name,
            room_number: `${s.invoices.length} vouchers`,
            is_monthly: true,
            admin_signed: true,
            period_label: periodKey,
            reviewed_at: s.reviewed_at,
            admin_signer_name: s.admin_signer_name,
          },
          notes: `Monthly voucher register approved & signed by ${s.admin_signer_name ?? "Admin"}`,
          issued_by: s.reviewed_by ?? s.submitted_by,
          issuer_name: s.admin_signer_name ?? "Admin Ephemeris",
          signature_data_url: s.admin_signature_data_url ?? null,
          signature_signer_name: s.admin_signer_name ?? null,
          signed_by: s.reviewed_by ?? null,
          signed_at: s.reviewed_at ?? null,
          staff_signature_data_url: s.staff_signature_data_url ?? null,
          staff_signer_name: s.staff_signer_name ?? null,
          resort_recorded_at: s.reviewed_at,
          resort_recorded_by: s.reviewed_by,
          source_reference: s.period_start,
          created_at: s.created_at,
          updated_at: s.updated_at,
          monthlySubmissionRaw: s,
        };
      });
  }, [monthlySubmissions]);

  const allInvoices = React.useMemo(() => {
    return [...monthlyInvoiceItems, ...invoices];
  }, [monthlyInvoiceItems, invoices]);

  const rows = React.useMemo(() => {
    return allInvoices
      .filter((invoice) => {
        if (!normalizedSearch) return true;
        return [
          invoice.invoice_number,
          invoice.recipient_name,
          invoice.recipient_email,
          invoice.source_reference,
          snapshotText(invoice, "resort_name"),
          snapshotText(invoice, "room_number"),
          invoice.invoice_type,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalizedSearch),
        );
      })
      .sort((a, b) => {
        // ALWAYS ON TOP IF SIGNED BY ADMIN:
        const aAdminSigned = a.invoice_type === "monthly" || Boolean(a.source_snapshot?.admin_signed);
        const bAdminSigned = b.invoice_type === "monthly" || Boolean(b.source_snapshot?.admin_signed);

        if (aAdminSigned && !bAdminSigned) return -1;
        if (!aAdminSigned && bAdminSigned) return 1;

        const dateA = new Date(a.issued_at || a.created_at).getTime();
        const dateB = new Date(b.issued_at || b.created_at).getTime();
        return dateB - dateA;
      });
  }, [allInvoices, normalizedSearch]);
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
            {rows.map((invoice) => {
              const isMonthly = invoice.invoice_type === "monthly";
              const rawMonthly = (invoice as InvoiceRow & { monthlySubmissionRaw?: MonthlyInvoiceSubmissionRow }).monthlySubmissionRaw;
              const handleOpen = () => {
                if (isMonthly && rawMonthly && onOpenMonthly) {
                  onOpenMonthly(rawMonthly);
                } else {
                  onOpen(invoice);
                }
              };

              return (
                <tr
                  key={invoice.id}
                  className="cursor-pointer border-t transition-colors hover:bg-muted/45"
                  onClick={handleOpen}
                  onDoubleClick={handleOpen}
                >
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium font-mono">{invoice.invoice_number}</p>
                      {isMonthly ? (
                        <Badge variant="secondary" className="text-[10px]">
                          ✓ Signed by Admin
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {invoice.invoice_type === "customer"
                        ? "Guest invoice"
                        : isMonthly
                          ? "Monthly customer invoice register"
                          : "Staff payout"}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="font-medium">{invoice.recipient_name}</p>
                    <p className="text-muted-foreground text-xs">{invoice.recipient_detail || invoice.recipient_email || "No email"}</p>
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
                    ) : isMonthly ? (
                      <Badge variant="outline" className="text-xs">
                        ✓ Admin Approved
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-medium">
                    {formatUsd(invoice.total_usd)}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpen();
                      }}
                    >
                      <Eye data-icon="inline-start" />
                      Open
                    </Button>
                  </td>
                </tr>
              );
            })}
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
