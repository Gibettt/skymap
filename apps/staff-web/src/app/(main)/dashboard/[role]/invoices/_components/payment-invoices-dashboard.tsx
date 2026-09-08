"use client";

import * as React from "react";

import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  Download,
  FilePlus2,
  Hash,
  Printer,
  ReceiptText,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { InvoiceRow, PaymentWorkflowRow } from "./types";

const MAX_PAPER_SCALE = 0.58;

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

function InvoicePrintPortal({ invoice }: { invoice: InvoiceRow | null }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted || !invoice) return null;

  return createPortal(
    <div data-print-root>
      <InvoiceDocument invoice={invoice} />
    </div>,
    document.body,
  );
}

function InvoicePreview({ invoice, onPrint }: { invoice: InvoiceRow | null; onPrint: (pdf?: boolean) => void }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const scale = usePaperScale(containerRef);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>{invoice?.invoice_number ?? "Select a completed payment to preview its invoice."}</CardDescription>
        <CardAction>
          <ButtonGroup>
            <Button type="button" size="sm" variant="outline" disabled={!invoice} onClick={() => onPrint()}>
              <Printer data-icon="inline-start" />
              Print
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!invoice} onClick={() => onPrint(true)}>
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
                <InvoiceDocument invoice={invoice} />
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

function PaymentWorkflow({
  busy,
  onConfirm,
  onGenerate,
  onSelect,
  readOnly,
  row,
  rows,
}: {
  busy: boolean;
  onConfirm: (row: PaymentWorkflowRow) => void;
  onGenerate: (row: PaymentWorkflowRow) => void;
  onSelect: (id: string) => void;
  readOnly: boolean;
  row: PaymentWorkflowRow | null;
  rows: PaymentWorkflowRow[];
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
          <MoneyField id="payment-gst" label="GST" value={row.tax_usd ?? 0} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="font-medium">Customer total</p>
            <p className="text-muted-foreground text-xs">Payment and invoice are saved in one transaction.</p>
          </div>
          <p className="font-semibold tabular-nums">{formatUsd(row.amount_usd)}</p>
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
  invoices,
  readOnly,
  workflows,
}: {
  invoices: InvoiceRow[];
  readOnly: boolean;
  workflows: PaymentWorkflowRow[];
}) {
  const [issuedInvoices, setIssuedInvoices] = React.useState(invoices);
  const [workflowRows, setWorkflowRows] = React.useState(workflows);
  const [selectedId, setSelectedId] = React.useState(workflows[0]?.id ?? "");
  const [pending, setPending] = React.useState(false);
  const [dialogRow, setDialogRow] = React.useState<PaymentWorkflowRow | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState("Bank transfer");
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");

  const selectedWorkflow = workflowRows.find((row) => row.id === selectedId) ?? workflowRows[0] ?? null;
  const selectedInvoice = selectedWorkflow?.invoice_id
    ? (issuedInvoices.find((invoice) => invoice.id === selectedWorkflow.invoice_id) ?? null)
    : null;

  function printInvoice(saveAsPdf = false) {
    if (!selectedInvoice) return;
    if (saveAsPdf) toast.info("Choose ‘Save as PDF’ in the print destination.");
    window.requestAnimationFrame(() => window.print());
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

  async function confirmPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogRow || pending || readOnly) return;
    if (paymentMethod === "Bank transfer" && !paymentReference.trim()) {
      toast.error("A bank transfer reference is required.");
      return;
    }

    const row = dialogRow;
    setPending(true);
    try {
      const response = await fetch(`/api/payments/${row.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, reference: paymentReference, notes: paymentNotes }),
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
          <Badge variant="outline">{readOnly ? "Internal · View only" : "Internal staff"}</Badge>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>Customer payment confirmation and invoice generation.</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentWorkflow
                busy={pending}
                row={selectedWorkflow}
                rows={workflowRows}
                readOnly={readOnly}
                onSelect={setSelectedId}
                onConfirm={openConfirmation}
                onGenerate={generateInvoice}
              />
            </CardContent>
          </Card>

          <InvoicePreview invoice={selectedInvoice} onPrint={printInvoice} />
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
                  placeholder={paymentMethod === "Bank transfer" ? "Bank transaction reference" : "Cash receipt reference"}
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
                  <Badge variant="outline">{formatUsd(dialogRow.amount_usd)}</Badge>
                </div>
              ) : null}
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending || (paymentMethod === "Bank transfer" && !paymentReference.trim())}>
                {pending ? <Spinner data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
                {pending ? "Confirming..." : "Confirm & generate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <InvoicePrintPortal invoice={selectedInvoice} />
    </>
  );
}
