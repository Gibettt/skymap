"use client";

import * as React from "react";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Download,
  FilePlus2,
  Hash,
  PenLine,
  Printer,
  ReceiptText,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { getInitials } from "@/lib/utils";

import { formatUsd, titleCase } from "../../_lib/staff-api";
import { INVOICE_PAPER_HEIGHT, INVOICE_PAPER_WIDTH, InvoiceDocument } from "./invoice-document";
import {
  MonthlyInvoiceSubmissionPanel,
  type MonthlyStaffInvoiceData,
  MonthlyStaffInvoiceDocument,
  monthLabel,
} from "./monthly-invoice-submission";
import { MonthlyStaffSignatureDialog } from "./monthly-staff-signature-dialog";
import { CustomerSignatureDialog } from "./customer-signature-dialog";
import type {
  InvoiceRow,
  MonthlyInvoiceStaffSignature,
  MonthlyInvoiceSubmission,
  PaymentWorkflowRow,
} from "./types";

const MAX_PAPER_SCALE = 0.58;
type TaxType = "none" | "tgst" | "vat" | "sales_tax" | "custom";

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function taxTypeFromLabel(label?: string): TaxType {
  if (label === "No tax") return "none";
  if (label === "Tourism GST (TGST)") return "tgst";
  if (label === "VAT") return "vat";
  if (label === "Sales tax") return "sales_tax";
  return "custom";
}

function taxLabelForType(type: TaxType, customLabel: string) {
  const labels: Record<Exclude<TaxType, "custom">, string> = {
    none: "No tax",
    tgst: "Tourism GST (TGST)",
    vat: "VAT",
    sales_tax: "Sales tax",
  };
  return type === "custom" ? customLabel.trim() : labels[type];
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function normalizePaymentMethod(value: string | null) {
  return value?.trim().toLowerCase() === "cash" ? "Cash" : "Bank transfer";
}

function upsertInvoice(current: InvoiceRow[], invoice: InvoiceRow) {
  return [invoice, ...current.filter((item) => item.id !== invoice.id)];
}

function usePaperScale(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = React.useState(MAX_PAPER_SCALE);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const availableWidth = Math.max(160, container.clientWidth - 32);
      setScale(Math.min(MAX_PAPER_SCALE, availableWidth / INVOICE_PAPER_WIDTH));
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return scale;
}

function InvoicePrintPortal({ active, invoice }: { active: boolean; invoice: InvoiceRow | null }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted || !active || !invoice) return null;

  return createPortal(
    <div data-print-root>
      <InvoiceDocument invoice={invoice} />
    </div>,
    document.body,
  );
}

function MonthlyInvoicePrintPortal({ active, data }: { active: boolean; data: MonthlyStaffInvoiceData | null }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted || !active || !data) return null;

  return createPortal(
    <div data-print-root data-print-kind="monthly">
      <MonthlyStaffInvoiceDocument data={data} />
    </div>,
    document.body,
  );
}

function InvoicePreview({
  invoice,
  readOnly,
  statusPending,
  onPrint,
  onResortStatus,
  onSignGuest,
  onSignStaff,
  staffRole,
  staffName,
}: {
  invoice: InvoiceRow | null;
  readOnly: boolean;
  statusPending: boolean;
  onPrint: (pdf?: boolean) => void;
  onResortStatus: () => void;
  onSignGuest?: () => void;
  onSignStaff?: () => void;
  staffRole?: string;
  staffName?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scale = usePaperScale(containerRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>
          {invoice?.invoice_number ?? "Select a completed payment to preview its invoice."}
        </CardDescription>
        <CardAction>
          <ButtonGroup>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!invoice || readOnly}
              onClick={onSignGuest}
              className={invoice?.signature_data_url ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-medium" : ""}
            >
              <PenLine data-icon="inline-start" className="size-3.5" />
              {invoice?.signature_data_url ? "Guest signed ✓" : "Guest signature"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!invoice || readOnly}
              onClick={onSignStaff}
              className={invoice?.staff_signature_data_url ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-medium" : ""}
            >
              <PenLine data-icon="inline-start" className="size-3.5" />
              {invoice?.staff_signature_data_url ? "Staff signed ✓" : "Staff signature"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!invoice || readOnly || statusPending}
              onClick={onResortStatus}
            >
              {statusPending ? <Spinner data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
              {invoice?.resort_recorded_at ? "Resort entered" : "Mark resort entered"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!invoice} onClick={() => onPrint()}>
              <Printer data-icon="inline-start" />
              Print
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!invoice}
              onClick={() => onPrint(true)}
            >
              <Download data-icon="inline-start" />
              PDF
            </Button>
          </ButtonGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="relative min-h-[42rem] overflow-hidden bg-muted p-4">
          {!invoice ? (
            <Empty className="absolute inset-0 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ReceiptText />
                </EmptyMedia>
                <EmptyTitle>No generated invoice</EmptyTitle>
                <EmptyDescription>
                  Confirm a customer payment or select one that already has an invoice.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div
              style={{
                height: INVOICE_PAPER_HEIGHT * scale,
                width: INVOICE_PAPER_WIDTH * scale,
              }}
              className="absolute top-4 left-1/2 -translate-x-1/2 shadow-sm"
            >
              <div style={{ transform: `scale(${scale})` }} className="origin-top-left">
                <InvoiceDocument invoice={invoice} onSignGuest={onSignGuest} onSignStaff={onSignStaff} staffRole={staffRole} currentStaffName={staffName} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyInvoicePreview({ data }: { data: MonthlyStaffInvoiceData | null }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scale = usePaperScale(containerRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly invoice preview</CardTitle>
        <CardDescription>
          {data ? `${monthLabel(data.month)} · ${data.invoices.length} customer invoices` : "Select a month to preview."}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="relative min-h-[42rem] overflow-hidden bg-muted p-4">
          {!data ? (
            <Empty className="absolute inset-0 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon"><ReceiptText /></EmptyMedia>
                <EmptyTitle>No monthly invoice selected</EmptyTitle>
                <EmptyDescription>Choose the monthly invoice view and select a billing month.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div
              style={{ height: INVOICE_PAPER_HEIGHT * scale, width: INVOICE_PAPER_WIDTH * scale }}
              className="absolute top-4 left-1/2 -translate-x-1/2 shadow-sm"
            >
              <div style={{ transform: `scale(${scale})` }} className="origin-top-left">
                <MonthlyStaffInvoiceDocument data={data} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowSelector({
  onSelect,
  row,
  rows,
}: {
  onSelect: (id: string) => void;
  row: PaymentWorkflowRow;
  rows: PaymentWorkflowRow[];
}) {
  return (
    <Field className="gap-1">
      <FieldLabel className="text-xs">Customer payment</FieldLabel>
      <Select value={row.id} onValueChange={onSelect}>
        <SelectTrigger className="w-full data-[size=default]:h-auto">
          <SelectValue>
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="after:rounded-md">
                <AvatarFallback className="rounded-md bg-card text-foreground">
                  {getInitials(row.recipient_name).slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left text-xs">
                <div className="truncate">{row.recipient_name}</div>
                <div className="truncate text-muted-foreground">
                  {row.reference} · {formatUsd(row.amount_usd)}
                </div>
              </div>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {rows.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.reference} · {option.recipient_name} · {titleCase(option.workflow_status)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function MoneyField({ id, label, value }: { id: string; label: string; value: number }) {
  return (
    <Field className="gap-1">
      <FieldLabel className="text-xs" htmlFor={id}>
        {label}
      </FieldLabel>
      <InputGroup>
        <InputGroupAddon align="inline-start">$</InputGroupAddon>
        <InputGroupInput id={id} value={value.toFixed(2)} readOnly />
      </InputGroup>
    </Field>
  );
}

function TaxField({
  amount,
  customLabel,
  disabled,
  onCustomLabelChange,
  onRateChange,
  onTypeChange,
  rate,
  type,
}: {
  amount: number;
  customLabel: string;
  disabled: boolean;
  onCustomLabelChange: (value: string) => void;
  onRateChange: (value: string) => void;
  onTypeChange: (value: TaxType) => void;
  rate: string;
  type: TaxType;
}) {
  return (
    <Field className="gap-2 rounded-lg border p-3 lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <FieldLabel>Tax</FieldLabel>
            {!disabled ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2"
                onClick={() => onTypeChange("custom")}
              >
                + Add custom
              </Button>
            ) : null}
          </div>
          <FieldDescription>Select the applicable tax before confirming payment.</FieldDescription>
        </div>
        <Badge variant="outline">{formatUsd(amount)}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={type} onValueChange={(value) => onTypeChange(value as TaxType)} disabled={disabled}>
          <SelectTrigger id="payment-tax-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="none">No tax</SelectItem>
              <SelectItem value="tgst">Tourism GST (TGST)</SelectItem>
              <SelectItem value="vat">VAT</SelectItem>
              <SelectItem value="sales_tax">Sales tax</SelectItem>
              <SelectItem value="custom">Custom tax</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {type === "custom" ? (
          <Input
            aria-label="Custom tax name"
            value={customLabel}
            onChange={(event) => onCustomLabelChange(event.target.value)}
            disabled={disabled}
            maxLength={80}
            placeholder="Tax name"
          />
        ) : null}
        <InputGroup>
          <InputGroupInput
            id="payment-tax-rate"
            aria-label="Tax rate percentage"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.01"
            value={rate}
            onChange={(event) => onRateChange(event.target.value)}
            disabled={disabled || type === "none"}
          />
          <InputGroupAddon align="inline-end">%</InputGroupAddon>
        </InputGroup>
      </div>
    </Field>
  );
}

function PaymentWorkflow({
  busy,
  onConfirm,
  onGenerate,
  onSelect,
  onTaxCustomLabelChange,
  onTaxRateChange,
  onTaxTypeChange,
  readOnly,
  row,
  rows,
  taxAmount,
  taxCustomLabel,
  taxRate,
  taxType,
  totalAmount,
}: {
  busy: boolean;
  onConfirm: (row: PaymentWorkflowRow) => void;
  onGenerate: (row: PaymentWorkflowRow) => void;
  onSelect: (id: string) => void;
  onTaxCustomLabelChange: (value: string) => void;
  onTaxRateChange: (value: string) => void;
  onTaxTypeChange: (value: TaxType) => void;
  readOnly: boolean;
  row: PaymentWorkflowRow | null;
  rows: PaymentWorkflowRow[];
  taxAmount: number;
  taxCustomLabel: string;
  taxRate: string;
  taxType: TaxType;
  totalAmount: number;
}) {
  if (!row) {
    return (
      <Empty className="min-h-[32rem] border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Banknote />
          </EmptyMedia>
          <EmptyTitle>No customer payments</EmptyTitle>
          <EmptyDescription>Chargeable bookings for this resort will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkflowSelector row={row} rows={rows} onSelect={onSelect} />
      <Separator />
      <section className="flex flex-col gap-3">
        <div className="grid gap-4 md:grid-cols-2">
          <Field className="gap-1">
            <FieldLabel className="text-xs" htmlFor="payment-reference-number">
              Reference number
            </FieldLabel>
            <InputGroup>
              <InputGroupInput id="payment-reference-number" value={row.reference} readOnly />
              <InputGroupAddon align="inline-end">
                <Hash />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field className="gap-1">
            <FieldLabel className="text-xs" htmlFor="payment-experience-date">
              Experience date
            </FieldLabel>
            <InputGroup>
              <InputGroupInput id="payment-experience-date" value={formatDate(row.source_date)} readOnly />
              <InputGroupAddon align="inline-end">
                <CalendarDays />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </div>
      </section>
      <Separator />
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium tracking-tight">Customer</h2>
          <Badge variant={row.workflow_status === "paid" ? "default" : "secondary"}>
            {titleCase(row.workflow_status)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 rounded-lg border p-3">
          <Avatar size="lg">
            <AvatarFallback>{getInitials(row.recipient_name).slice(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{row.recipient_name}</p>
            <p className="truncate text-muted-foreground text-xs">{row.recipient_email ?? "No email"}</p>
            <p className="truncate text-muted-foreground text-xs">{row.context_name ?? "No resort"}</p>
          </div>
        </div>
      </section>
      <Separator />
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium tracking-tight">Payment summary</h2>
          <Badge variant="outline">{row.payment_method ?? "Method not set"}</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <MoneyField id="payment-subtotal" label="Subtotal" value={row.base_total_usd ?? 0} />
          <MoneyField id="payment-service-charge" label="Service charge" value={row.service_charge_usd ?? 0} />
          <MoneyField id="payment-tax" label="Tax amount" value={taxAmount} />
          <TaxField
            amount={taxAmount}
            customLabel={taxCustomLabel}
            disabled={readOnly || row.workflow_status !== "pending"}
            onCustomLabelChange={onTaxCustomLabelChange}
            onRateChange={onTaxRateChange}
            onTypeChange={onTaxTypeChange}
            rate={taxRate}
            type={taxType}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="font-medium">Customer total</p>
            <p className="text-muted-foreground text-xs">Payment and invoice are saved in one transaction.</p>
          </div>
          <p className="font-semibold tabular-nums">{formatUsd(totalAmount)}</p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="font-medium">{row.invoice_id ? "Invoice generated" : "Invoice not generated"}</p>
            <p className="truncate text-muted-foreground text-xs">
              {row.invoice_number ?? "Confirm the payment before generating the invoice."}
            </p>
          </div>
          <Badge variant={row.invoice_id ? "default" : "outline"}>{row.invoice_id ? "Ready" : "Pending"}</Badge>
        </div>
        <div className="flex justify-end">
          {readOnly ? (
            <Button type="button" variant="outline" disabled>
              View only
            </Button>
          ) : null}
          {!readOnly && row.workflow_status === "pending" ? (
            <Button type="button" disabled={busy} onClick={() => onConfirm(row)}>
              {busy ? <Spinner data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
              Confirm payment & generate invoice
            </Button>
          ) : null}
          {!readOnly && row.workflow_status === "paid" && !row.invoice_id ? (
            <Button type="button" disabled={busy} onClick={() => onGenerate(row)}>
              {busy ? <Spinner data-icon="inline-start" /> : <FilePlus2 data-icon="inline-start" />}
              Generate invoice
            </Button>
          ) : null}
          {!readOnly && row.workflow_status === "paid" && row.invoice_id ? (
            <Button type="button" variant="outline" disabled>
              <CheckCircle2 data-icon="inline-start" />
              Payment confirmed
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function PaymentInvoicesDashboard({
  initialSelectedId,
  initialView = "customer",
  invoices,
  monthlySignatures,
  monthlySubmissions,
  readOnly,
  staffName,
  workflows,
  staffRole = "internal",
}: {
  initialSelectedId?: string;
  initialView?: "customer" | "monthly";
  invoices: InvoiceRow[];
  monthlySignatures: MonthlyInvoiceStaffSignature[];
  monthlySubmissions: MonthlyInvoiceSubmission[];
  readOnly: boolean;
  staffName: string;
  workflows: PaymentWorkflowRow[];
  staffRole?: string;
}) {
  const [issuedInvoices, setIssuedInvoices] = React.useState(invoices);
  const [staffSignatureRows, setStaffSignatureRows] = React.useState(monthlySignatures);
  const [submissionRows, setSubmissionRows] = React.useState(monthlySubmissions);
  const [workflowRows, setWorkflowRows] = React.useState(workflows);
  const [selectedId, setSelectedId] = React.useState(
    workflows.some((workflow) => workflow.id === initialSelectedId)
      ? (initialSelectedId ?? "")
      : (workflows[0]?.id ?? ""),
  );
  const [pending, setPending] = React.useState(false);
  const [signaturePending, setSignaturePending] = React.useState(false);
  const [monthlySignaturePending, setMonthlySignaturePending] = React.useState(false);
  const [monthlySignatureOpen, setMonthlySignatureOpen] = React.useState(false);
  const [monthlySignatureMonth, setMonthlySignatureMonth] = React.useState("");
  const [monthlySignatureCurrent, setMonthlySignatureCurrent] = React.useState<MonthlyInvoiceStaffSignature | null>(null);
  const [monthlyPending, setMonthlyPending] = React.useState(false);
  const [invoiceView, setInvoiceView] = React.useState<"customer" | "monthly">(initialView);
  const [printTarget, setPrintTarget] = React.useState<"individual" | "monthly" | null>(null);
  const [monthlyPrintData, setMonthlyPrintData] = React.useState<MonthlyStaffInvoiceData | null>(null);
  const [monthlyPreviewData, setMonthlyPreviewData] = React.useState<MonthlyStaffInvoiceData | null>(null);
  const [dialogRow, setDialogRow] = React.useState<PaymentWorkflowRow | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState("Bank transfer");
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [taxType, setTaxType] = React.useState<TaxType>(taxTypeFromLabel(workflows[0]?.tax_label));
  const [taxCustomLabel, setTaxCustomLabel] = React.useState(
    taxTypeFromLabel(workflows[0]?.tax_label) === "custom" ? (workflows[0]?.tax_label ?? "") : "",
  );
  const [taxRate, setTaxRate] = React.useState(String(workflows[0]?.tax_rate_percent ?? 17));

  const selectedWorkflow = workflowRows.find((row) => row.id === selectedId) ?? workflowRows[0] ?? null;
  const selectedInvoice = selectedWorkflow?.invoice_id
    ? (issuedInvoices.find((invoice) => invoice.id === selectedWorkflow.invoice_id) ?? null)
    : null;
  const parsedTaxRate = taxType === "none" ? 0 : Number(taxRate);
  const effectiveTaxRate = Number.isFinite(parsedTaxRate) ? Math.min(100, Math.max(0, parsedTaxRate)) : 0;
  const isTgst = taxType === "tgst" || taxCustomLabel.toUpperCase().includes("TGST") || taxCustomLabel.toUpperCase().includes("TOURIS");
  const taxableBase = isTgst
    ? roundMoney((selectedWorkflow?.base_total_usd ?? 0) + (selectedWorkflow?.service_charge_usd ?? 0))
    : (selectedWorkflow?.base_total_usd ?? 0);
  const taxAmount = roundMoney(taxableBase * (effectiveTaxRate / 100));
  const totalAmount = roundMoney(
    (selectedWorkflow?.base_total_usd ?? 0) + (selectedWorkflow?.service_charge_usd ?? 0) + taxAmount,
  );

  React.useEffect(() => {
    if (!selectedWorkflow) return;
    const nextType = taxTypeFromLabel(selectedWorkflow.tax_label);
    setTaxType(nextType);
    setTaxCustomLabel(nextType === "custom" ? (selectedWorkflow.tax_label ?? "") : "");
    setTaxRate(String(nextType === "none" ? 0 : (selectedWorkflow.tax_rate_percent ?? 17)));
  }, [selectedWorkflow]);

  React.useEffect(() => {
    if (!selectedId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("payment") === selectedId) return;
    url.searchParams.set("payment", selectedId);
    window.history.replaceState(window.history.state, "", url);
  }, [selectedId]);

  function printInvoice(saveAsPdf = false) {
    if (!selectedInvoice) return;
    setPrintTarget("individual");
    if (saveAsPdf) toast.info("Choose ‘Save as PDF’ in the print destination.");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  function printMonthlyInvoice(data: MonthlyStaffInvoiceData, saveAsPdf: boolean) {
    setMonthlyPrintData(data);
    setPrintTarget("monthly");
    if (saveAsPdf) toast.info("Choose ‘Save as PDF’ in the print destination.");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  function openMonthlyStaffSignature(month: string, signature: MonthlyInvoiceStaffSignature | null) {
    setMonthlySignatureMonth(month);
    setMonthlySignatureCurrent(signature);
    setMonthlySignatureOpen(true);
  }

  async function submitMonthlyInvoice(month: string) {
    if (monthlyPending || readOnly) return;
    setMonthlyPending(true);
    try {
      const response = await fetch("/api/monthly-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: month }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        submission?: MonthlyInvoiceSubmission;
        resubmitted?: boolean;
      };
      if (!response.ok || !result.submission) throw new Error(result.error ?? "Could not send the monthly invoice.");
      setSubmissionRows((current) => [
        result.submission as MonthlyInvoiceSubmission,
        ...current.filter((item) => item.id !== result.submission?.id),
      ]);
      toast.success(result.resubmitted ? "Monthly invoice resent to Admin." : "Monthly invoice sent to Admin.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the monthly invoice.");
    } finally {
      setMonthlyPending(false);
    }
  }

  async function syncDashboard(keepSelectedId: string) {
    try {
      const response = await fetch("/api/invoices", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        invoices?: InvoiceRow[];
        workflows?: { payment?: PaymentWorkflowRow[] };
      };
      if (!response.ok || !data.invoices || !data.workflows?.payment) {
        throw new Error(data.error ?? "Could not refresh invoice data.");
      }
      setIssuedInvoices(data.invoices);
      setWorkflowRows(data.workflows.payment);
      setSelectedId(keepSelectedId);
    } catch {
      toast.warning("The change was saved, but the latest data could not be reloaded. Refresh the page.");
    }
  }

  function openConfirmation(row: PaymentWorkflowRow) {
    if (readOnly) return;
    setDialogRow(row);
    setPaymentMethod(normalizePaymentMethod(row.payment_method));
    setPaymentReference(row.payment_reference ?? "");
    setPaymentNotes(row.payment_notes ?? "");
  }

  function changeTaxType(value: TaxType) {
    setTaxType(value);
    if (value === "none") setTaxRate("0");
    if (value === "tgst") setTaxRate("17");
    if (value !== "custom") setTaxCustomLabel("");
  }

  async function confirmPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogRow || pending || readOnly) return;
    if (paymentMethod === "Bank transfer" && !paymentReference.trim()) {
      toast.error("A bank transfer reference is required.");
      return;
    }
    if (taxType === "custom" && !taxCustomLabel.trim()) {
      toast.error("Enter a name for the custom tax.");
      return;
    }
    if (!Number.isFinite(Number(taxRate)) || Number(taxRate) < 0 || Number(taxRate) > 100) {
      toast.error("Tax rate must be between 0 and 100 percent.");
      return;
    }

    const row = dialogRow;
    setPending(true);
    try {
      const response = await fetch(`/api/payments/${row.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          reference: paymentReference,
          notes: paymentNotes,
          taxType,
          taxLabel: taxType === "custom" ? taxCustomLabel.trim() : null,
          taxRatePercent: effectiveTaxRate,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        invoice?: InvoiceRow;
        confirmed?: boolean;
      };
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Could not confirm customer payment.");

      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      setWorkflowRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                workflow_status: "paid",
                payment_method: paymentMethod,
                payment_reference: paymentReference.trim() || null,
                payment_notes: paymentNotes.trim() || null,
                tax_label: taxLabelForType(taxType, taxCustomLabel),
                tax_rate_percent: effectiveTaxRate,
                tax_usd: taxAmount,
                amount_usd: totalAmount,
                confirmed_at: new Date().toISOString(),
                invoice_id: result.invoice?.id ?? null,
                invoice_number: result.invoice?.invoice_number ?? null,
                invoice_status: result.invoice?.status ?? null,
              }
            : item,
        ),
      );
      setDialogRow(null);
      toast.success(result.confirmed ? "Payment confirmed and invoice generated." : "Invoice is ready.");
      await syncDashboard(row.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not confirm customer payment.");
    } finally {
      setPending(false);
    }
  }

  async function generateInvoice(row: PaymentWorkflowRow) {
    if (pending || readOnly) return;
    setPending(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "customer", sourceId: row.id }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; invoice?: InvoiceRow };
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Could not generate the invoice.");

      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      setWorkflowRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                invoice_id: result.invoice?.id ?? null,
                invoice_number: result.invoice?.invoice_number ?? null,
                invoice_status: result.invoice?.status ?? null,
              }
            : item,
        ),
      );
      toast.success("Customer invoice generated.");
      await syncDashboard(row.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the invoice.");
    } finally {
      setPending(false);
    }
  }

  async function saveMonthlyStaffSignature(signatureDataUrl: string) {
    if (!monthlySignatureMonth || monthlySignaturePending || readOnly) return;
    setMonthlySignaturePending(true);
    try {
      const response = await fetch("/api/monthly-invoices/signature", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: monthlySignatureMonth, signatureDataUrl }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        signature?: MonthlyInvoiceStaffSignature;
      };
      if (!response.ok || !result.signature) {
        throw new Error(result.error ?? "Could not save the responsible staff signature.");
      }
      setStaffSignatureRows((current) => [
        result.signature as MonthlyInvoiceStaffSignature,
        ...current.filter((item) => item.id !== result.signature?.id),
      ]);
      setMonthlySignatureCurrent(result.signature);
      setMonthlySignatureOpen(false);
      toast.success("Responsible staff signature saved successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the responsible staff signature.");
    } finally {
      setMonthlySignaturePending(false);
    }
  }

  async function toggleResortStatus() {
    if (!selectedInvoice || signaturePending || readOnly) return;
    setSignaturePending(true);
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/resort-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recorded: !selectedInvoice.resort_recorded_at }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; invoice?: InvoiceRow };
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Could not update the resort status.");
      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      toast.success(result.invoice.resort_recorded_at ? "Marked as entered by the resort." : "Resort status cleared.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the resort status.");
    } finally {
      setSignaturePending(false);
    }
  }
  const [customerSignatureOpen, setCustomerSignatureOpen] = React.useState(false);
  const [customerSignaturePending, setCustomerSignaturePending] = React.useState(false);

  async function saveCustomerSignature(signatureDataUrl: string, signerName: string) {
    if (!selectedInvoice) return;
    setCustomerSignaturePending(true);
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/signature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl, signerName }),
      });
      const result = await response.json();
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Gagal menyimpan tanda tangan tamu.");
      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      setCustomerSignatureOpen(false);
      toast.success("Tanda tangan tamu berhasil dibubuhkan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan tanda tangan.");
    } finally {
      setCustomerSignaturePending(false);
    }
  }

  async function clearCustomerSignature() {
    if (!selectedInvoice) return;
    setCustomerSignaturePending(true);
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/signature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: null }),
      });
      const result = await response.json();
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Gagal menghapus tanda tangan.");
      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      setCustomerSignatureOpen(false);
      toast.success("Tanda tangan tamu berhasil dihapus.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus tanda tangan.");
    } finally {
      setCustomerSignaturePending(false);
    }
  }
  const [staffSignatureOpen, setStaffSignatureOpen] = React.useState(false);
  const [staffSignaturePending, setStaffSignaturePending] = React.useState(false);

  async function saveStaffSignature(signatureDataUrl: string, signerName: string) {
    if (!selectedInvoice) return;
    setStaffSignaturePending(true);
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/signature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl, signerName, target: "staff" }),
      });
      const result = await response.json();
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Gagal menyimpan tanda tangan staf.");
      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      setStaffSignatureOpen(false);
      toast.success("Tanda tangan staf berhasil dibubuhkan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan tanda tangan staf.");
    } finally {
      setStaffSignaturePending(false);
    }
  }

  async function clearStaffSignature() {
    if (!selectedInvoice) return;
    setStaffSignaturePending(true);
    try {
      const response = await fetch(`/api/invoices/${selectedInvoice.id}/signature`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: null, target: "staff" }),
      });
      const result = await response.json();
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Gagal menghapus tanda tangan staf.");
      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      setStaffSignatureOpen(false);
      toast.success("Tanda tangan staf berhasil dihapus.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus tanda tangan staf.");
    } finally {
      setStaffSignaturePending(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-semibold text-2xl tracking-tight">Invoices</h1>
            <p className="text-muted-foreground text-sm">
              Confirm customer payments and generate invoices for your resort.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonGroup>
              <Button type="button" size="sm" variant={invoiceView === "customer" ? "default" : "outline"} onClick={() => setInvoiceView("customer")}>Customer invoice</Button>
              <Button type="button" size="sm" variant={invoiceView === "monthly" ? "default" : "outline"} onClick={() => setInvoiceView("monthly")}>Monthly invoice</Button>
            </ButtonGroup>
            <Badge variant="outline">{readOnly ? `${titleCase(staffRole)} · View only` : `${titleCase(staffRole)} staff`}</Badge>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {invoiceView === "customer" ? (
            <>
              <Card>
                <CardHeader><CardTitle>Payment</CardTitle><CardDescription>Customer payment confirmation and invoice generation.</CardDescription></CardHeader>
                <CardContent>
                  <PaymentWorkflow
                    busy={pending}
                    row={selectedWorkflow}
                    rows={workflowRows}
                    readOnly={readOnly}
                    onSelect={setSelectedId}
                    onConfirm={openConfirmation}
                    onGenerate={generateInvoice}
                    onTaxCustomLabelChange={setTaxCustomLabel}
                    onTaxRateChange={setTaxRate}
                    onTaxTypeChange={changeTaxType}
                    taxAmount={taxAmount}
                    taxCustomLabel={taxCustomLabel}
                    taxRate={taxRate}
                    taxType={taxType}
                    totalAmount={totalAmount}
                  />
                </CardContent>
              </Card>
              <InvoicePreview invoice={selectedInvoice} readOnly={readOnly} statusPending={signaturePending} onPrint={printInvoice} onResortStatus={toggleResortStatus} onSignGuest={() => setCustomerSignatureOpen(true)} onSignStaff={() => setStaffSignatureOpen(true)} staffRole={staffRole} staffName={staffName} />
            </>
          ) : (
            <>
              <MonthlyInvoiceSubmissionPanel
                invoices={issuedInvoices}
                pending={monthlyPending}
                readOnly={readOnly}
                signatures={staffSignatureRows}
                submissions={submissionRows}
                workflows={workflowRows}
                onPreviewChange={setMonthlyPreviewData}
                onPrint={printMonthlyInvoice}
                onSign={openMonthlyStaffSignature}
                onSubmit={submitMonthlyInvoice}
              />
              <MonthlyInvoicePreview data={monthlyPreviewData} />
            </>
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(dialogRow)}
        onOpenChange={(open) => {
          if (!open && !pending) setDialogRow(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={confirmPayment} className="contents">
            <DialogHeader>
              <DialogTitle>Confirm customer payment</DialogTitle>
              <DialogDescription>
                The payment and customer invoice are recorded together in one database transaction.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="internal-payment-method">Payment method</FieldLabel>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="internal-payment-method" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field data-invalid={paymentMethod === "Bank transfer" && !paymentReference.trim()}>
                <FieldLabel htmlFor="internal-payment-reference">
                  Transfer reference {paymentMethod === "Bank transfer" ? "*" : "(optional)"}
                </FieldLabel>
                <Input
                  id="internal-payment-reference"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  required={paymentMethod === "Bank transfer"}
                  aria-invalid={paymentMethod === "Bank transfer" && !paymentReference.trim()}
                  maxLength={120}
                  placeholder={
                    paymentMethod === "Bank transfer" ? "Bank transaction reference" : "Cash receipt reference"
                  }
                />
                <FieldDescription>Stored with the payment for reconciliation and audit history.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="internal-payment-notes">Confirmation notes</FieldLabel>
                <Input
                  id="internal-payment-notes"
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  maxLength={500}
                  placeholder="Optional internal note"
                />
              </Field>
              {dialogRow ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{dialogRow.recipient_name}</p>
                    <p className="truncate text-muted-foreground text-xs">{dialogRow.reference}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="!border-cyan-200/35 !bg-[#071d3d] !text-cyan-50 px-3 font-semibold tabular-nums"
                  >
                    {formatUsd(totalAmount)}
                  </Badge>
                </div>
              ) : null}
            </FieldGroup>
            <DialogFooter className="gap-2 border-cyan-200/15 border-t pt-4 sm:justify-end">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="!border-cyan-200/35 !bg-[#071d3d] !text-slate-100 hover:!bg-[#0b2a54] hover:!text-white disabled:!text-slate-300 disabled:!opacity-80"
                  disabled={pending}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                className="!bg-gradient-to-r !from-fuchsia-600 !to-violet-700 !text-white shadow-lg shadow-fuchsia-950/30 hover:!from-fuchsia-500 hover:!to-violet-600 disabled:!from-violet-900 disabled:!to-purple-900 disabled:!text-slate-300 disabled:!opacity-80"
                disabled={pending || (paymentMethod === "Bank transfer" && !paymentReference.trim())}
              >
                {pending ? <Spinner data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
                {pending ? "Confirming..." : "Confirm & generate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MonthlyStaffSignatureDialog
        current={monthlySignatureCurrent}
        monthLabel={monthlySignatureMonth ? monthLabel(monthlySignatureMonth) : "selected month"}
        open={monthlySignatureOpen}
        pending={monthlySignaturePending}
        staffName={staffName}
        onOpenChange={setMonthlySignatureOpen}
        onSave={saveMonthlyStaffSignature}
      />


      <CustomerSignatureDialog
        open={customerSignatureOpen}
        pending={customerSignaturePending}
        title="Guest Signature"
        description="Provide guest signature for Miscellaneous Charge Voucher."
        signerLabel="Guest Name"
        guestName={selectedInvoice?.recipient_name ?? ""}
        currentSignatureUrl={selectedInvoice?.signature_data_url ?? null}
        onOpenChange={setCustomerSignatureOpen}
        onSave={saveCustomerSignature}
        onClear={clearCustomerSignature}
      />
      <CustomerSignatureDialog
        open={staffSignatureOpen}
        pending={staffSignaturePending}
        title="Staff Signature"
        description={`Provide signature of responsible staff (${staffRole === "external" ? "External Staff" : "Internal Staff"}) for Miscellaneous Charge Voucher.`}
        signerLabel={`Staff Name (${staffRole === "external" ? "External Staff" : "Internal Staff"})`}
        guestName={selectedInvoice?.staff_signer_name || staffName || (staffRole === "external" ? "External Staff" : "Internal Staff")}
        currentSignatureUrl={selectedInvoice?.staff_signature_data_url ?? null}
        onOpenChange={setStaffSignatureOpen}
        onSave={saveStaffSignature}
        onClear={clearStaffSignature}
      />
      <InvoicePrintPortal active={printTarget === "individual"} invoice={selectedInvoice} />
      <MonthlyInvoicePrintPortal active={printTarget === "monthly"} data={monthlyPrintData} />
    </>
  );
}
