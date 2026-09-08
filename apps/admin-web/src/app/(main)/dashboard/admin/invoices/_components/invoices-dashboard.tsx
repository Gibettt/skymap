"use client";

import * as React from "react";

import {
  Banknote,
  Building2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getInitials } from "@/lib/utils";

import { useVisibleCenterPosition } from "../../../invoice/_components/use-visible-center-position";
import type { InvoiceRow, InvoiceWorkflowRow } from "../../_lib/admin-data";
import { formatUsd, titleCase } from "../../_lib/format";
import { INVOICE_PAPER_HEIGHT, INVOICE_PAPER_WIDTH, InvoiceDocument } from "./invoice-document";

type WorkflowTab = "payment" | "business";
type InvoiceWorkflows = Record<WorkflowTab, InvoiceWorkflowRow[]>;

const INVOICE_PAPER_SCALE = 0.6;

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

function shortReference(row: InvoiceWorkflowRow) {
  return row.type === "staff_payout" ? `Payout ${row.reference.slice(-8).toUpperCase()}` : row.reference;
}

function normalizedPaymentMethod(value: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "cash") return "Cash";
  return "Bank transfer";
}

function upsertInvoice(current: InvoiceRow[], invoice: InvoiceRow) {
  return [invoice, ...current.filter((item) => item.id !== invoice.id)];
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

function InvoicePreview({ invoice, onPrint }: { invoice: InvoiceRow | null; onPrint: (saveAsPdf?: boolean) => void }) {
  const previewBodyRef = React.useRef<HTMLDivElement>(null);
  const paperLayout = useVisibleCenterPosition(previewBodyRef, {
    height: INVOICE_PAPER_HEIGHT,
    maxScale: INVOICE_PAPER_SCALE,
    width: INVOICE_PAPER_WIDTH,
  });

  return (
    <div className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between px-4 py-4">
        <h2 className="font-medium text-lg">Preview</h2>
        <ButtonGroup>
          <Button type="button" variant="outline" disabled={!invoice} onClick={() => onPrint()}>
            <Printer data-icon="inline-start" />
            Print
          </Button>
          <Button type="button" variant="outline" disabled={!invoice} onClick={() => onPrint(true)}>
            <Download data-icon="inline-start" />
            Download PDF
          </Button>
        </ButtonGroup>
      </div>

      <div
        ref={previewBodyRef}
        className="@container/preview relative min-h-[calc(100svh-15rem)] flex-1 rounded-b-xl bg-stone-200 p-4 dark:bg-stone-800"
      >
        {!invoice ? (
          <Empty className="absolute inset-0 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptText />
              </EmptyMedia>
              <EmptyTitle>No generated document</EmptyTitle>
              <EmptyDescription>
                Complete the selected workflow to generate its customer or payout invoice.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {invoice && paperLayout === null ? (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">Loading Preview</div>
        ) : null}
        {invoice ? (
          <div
            style={{
              height: paperLayout
                ? INVOICE_PAPER_HEIGHT * paperLayout.scale
                : INVOICE_PAPER_HEIGHT * INVOICE_PAPER_SCALE,
              top: paperLayout?.top ?? "50%",
              transform: paperLayout === null ? "translate(-50%, -50%)" : "translateX(-50%)",
              width: paperLayout ? INVOICE_PAPER_WIDTH * paperLayout.scale : INVOICE_PAPER_WIDTH * INVOICE_PAPER_SCALE,
            }}
            className="absolute left-1/2 opacity-0 data-[ready=true]:opacity-100"
            data-ready={paperLayout !== null}
          >
            <div
              style={{ transform: `scale(${paperLayout?.scale ?? INVOICE_PAPER_SCALE})` }}
              className="origin-top-left"
            >
              <InvoiceDocument invoice={invoice} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function WorkflowSelector({
  label,
  onSelect,
  row,
  rows,
}: {
  label: string;
  onSelect: (id: string) => void;
  row: InvoiceWorkflowRow;
  rows: InvoiceWorkflowRow[];
}) {
  return (
    <Field className="gap-1">
      <FieldLabel className="text-xs">{label}</FieldLabel>
      <Select value={row.id} onValueChange={onSelect}>
        <SelectTrigger className="w-full data-[size=default]:h-auto">
          <SelectValue>
            <div className="flex min-w-0 items-center gap-1.5">
              <Avatar className="after:rounded-md">
                <AvatarFallback className="rounded-md bg-card text-foreground">
                  {getInitials(row.recipient_name).slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 text-left text-xs">
                <div className="truncate">{row.recipient_name}</div>
                <div className="truncate text-muted-foreground">
                  {shortReference(row)} · {formatUsd(row.amount_usd)}
                </div>
              </div>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectGroup>
            {rows.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {shortReference(option)} · {option.recipient_name} · {titleCase(option.workflow_status)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function WorkflowIdentity({ row }: { row: InvoiceWorkflowRow }) {
  return (
    <section className="flex flex-col gap-3">
      <Field className="gap-1">
        <FieldLabel className="text-xs" htmlFor={`${row.type}-reference`}>
          Reference Number
        </FieldLabel>
        <InputGroup>
          <InputGroupInput id={`${row.type}-reference`} value={shortReference(row)} readOnly />
          <InputGroupAddon align="inline-end">
            <Hash />
          </InputGroupAddon>
        </InputGroup>
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field className="gap-1">
          <FieldLabel className="text-xs" htmlFor={`${row.type}-source-date`}>
            {row.type === "customer" ? "Experience Date" : "Requested Date"}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput id={`${row.type}-source-date`} value={formatDate(row.source_date)} readOnly />
            <InputGroupAddon align="inline-end">
              <CalendarDays />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        <Field className="gap-1">
          <FieldLabel className="text-xs" htmlFor={`${row.type}-confirmed-date`}>
            {row.type === "customer" ? "Payment Confirmed" : "Payout Completed"}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput id={`${row.type}-confirmed-date`} value={formatDate(row.confirmed_at)} readOnly />
            <InputGroupAddon align="inline-end">
              <CalendarDays />
            </InputGroupAddon>
          </InputGroup>
        </Field>
      </div>
    </section>
  );
}

function RecipientDetails({ row }: { row: InvoiceWorkflowRow }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium tracking-tight">{row.type === "customer" ? "Customer" : "Staff Recipient"}</h2>
        <Badge
          variant={row.workflow_status === "paid" || row.workflow_status === "completed" ? "default" : "secondary"}
        >
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

function WorkflowInvoiceState({ row }: { row: InvoiceWorkflowRow }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="font-medium">{row.invoice_id ? "Document generated" : "Document not generated"}</p>
        <p className="truncate text-muted-foreground text-xs">
          {row.invoice_number ?? "Complete confirmation before generating the document."}
        </p>
      </div>
      <Badge variant={row.invoice_id ? "default" : "outline"}>{row.invoice_id ? "Ready" : "Pending"}</Badge>
    </div>
  );
}

function PaymentWorkflow({
  busy,
  onConfirm,
  onGenerate,
  onSelect,
  row,
  rows,
}: {
  busy: boolean;
  onConfirm: (row: InvoiceWorkflowRow) => void;
  onGenerate: (row: InvoiceWorkflowRow) => void;
  onSelect: (id: string) => void;
  row: InvoiceWorkflowRow | null;
  rows: InvoiceWorkflowRow[];
}) {
  if (!row) {
    return (
      <WorkflowEmpty
        icon="payment"
        title="No customer payments"
        description="There are no chargeable bookings in the payment workflow."
      />
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <WorkflowSelector label="Customer payment" row={row} rows={rows} onSelect={onSelect} />
      <Separator />
      <WorkflowIdentity row={row} />
      <Separator />
      <RecipientDetails row={row} />
      <Separator />
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium tracking-tight">Payment Summary</h2>
          <Badge variant="outline">{row.payment_method ?? "Method not set"}</Badge>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <MoneyField id="payment-subtotal" label="Subtotal" value={row.base_total_usd ?? 0} />
          <MoneyField id="payment-service-charge" label="Service charge" value={row.service_charge_usd ?? 0} />
          <MoneyField id="payment-gst" label="GST" value={row.tax_usd ?? 0} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div>
            <p className="font-medium">Customer total</p>
            <p className="text-muted-foreground text-xs">Payment confirmation and invoice creation are atomic.</p>
          </div>
          <p className="font-semibold tabular-nums">{formatUsd(row.amount_usd)}</p>
        </div>
        <WorkflowInvoiceState row={row} />
        <div className="flex justify-end">
          {row.workflow_status === "pending" ? (
            <Button type="button" disabled={busy} onClick={() => onConfirm(row)}>
              {busy ? <Spinner data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
              Confirm payment & generate invoice
            </Button>
          ) : null}
          {row.workflow_status === "paid" && !row.invoice_id ? (
            <Button type="button" disabled={busy} onClick={() => onGenerate(row)}>
              {busy ? <Spinner data-icon="inline-start" /> : <FilePlus2 data-icon="inline-start" />}
              Generate invoice
            </Button>
          ) : null}
          {row.workflow_status === "paid" && row.invoice_id ? (
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

function BusinessWorkflow({
  onSelect,
  row,
  rows,
}: {
  onSelect: (id: string) => void;
  row: InvoiceWorkflowRow | null;
  rows: InvoiceWorkflowRow[];
}) {
  if (!row) {
    return (
      <WorkflowEmpty
        icon="business"
        title="No payout invoices"
        description="Complete staff payouts from Finance. Their printable invoices will appear here automatically."
      />
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <WorkflowSelector label="Payout invoice" row={row} rows={rows} onSelect={onSelect} />
      <Separator />
      <WorkflowIdentity row={row} />
      <Separator />
      <RecipientDetails row={row} />
      <Separator />
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium tracking-tight">Payout Summary</h2>
          <Badge variant="outline">{row.bank_name ?? "Bank account"}</Badge>
        </div>
        <FieldGroup>
          <div className="grid gap-5 md:grid-cols-2">
            <Field className="gap-1">
              <FieldLabel className="text-xs" htmlFor="payout-account-holder">
                Account holder
              </FieldLabel>
              <Input id="payout-account-holder" value={row.account_holder_name ?? "—"} readOnly />
            </Field>
            <Field className="gap-1">
              <FieldLabel className="text-xs" htmlFor="payout-account-number">
                Account
              </FieldLabel>
              <Input id="payout-account-number" value={row.masked_account_number ?? "—"} readOnly />
            </Field>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <MoneyField id="payout-commission" label="Commission" value={row.commission_usd ?? 0} />
            <MoneyField id="payout-reward" label="Reward bonus" value={row.star_bonus_usd ?? 0} />
            <MoneyField id="payout-total" label="Payout total" value={row.amount_usd} />
          </div>
        </FieldGroup>
        <WorkflowInvoiceState row={row} />
      </section>
    </div>
  );
}

function WorkflowEmpty({ description, icon, title }: { description: string; icon: WorkflowTab; title: string }) {
  return (
    <Empty className="mt-4 min-h-[32rem] border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon === "payment" ? <Banknote /> : <Building2 />}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function InvoicesDashboard({
  initialSelectedId,
  initialTab = "payment",
  invoices,
  workflows,
}: {
  initialSelectedId?: string;
  initialTab?: WorkflowTab;
  invoices: InvoiceRow[];
  workflows: InvoiceWorkflows;
}) {
  const [issuedInvoices, setIssuedInvoices] = React.useState(invoices);
  const [workflowRows, setWorkflowRows] = React.useState(workflows);
  const [activeTab, setActiveTab] = React.useState<WorkflowTab>(initialTab);
  const [selectedIds, setSelectedIds] = React.useState<Record<WorkflowTab, string>>({
    payment: workflows.payment[0]?.id ?? "",
    business: initialSelectedId ?? workflows.business[0]?.id ?? "",
  });
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const [paymentDialogRow, setPaymentDialogRow] = React.useState<InvoiceWorkflowRow | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState("Bank transfer");
  const [paymentReference, setPaymentReference] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");

  const selectedWorkflow =
    workflowRows[activeTab].find((row) => row.id === selectedIds[activeTab]) ?? workflowRows[activeTab][0] ?? null;
  const selectedInvoice = selectedWorkflow?.invoice_id
    ? (issuedInvoices.find((invoice) => invoice.id === selectedWorkflow.invoice_id) ?? null)
    : null;
  const busy = pendingKey !== null;

  function selectWorkflow(tab: WorkflowTab, id: string) {
    setSelectedIds((current) => ({ ...current, [tab]: id }));
  }

  function printInvoice(saveAsPdf = false) {
    if (!selectedInvoice) return;
    if (saveAsPdf) toast.info("Choose ‘Save as PDF’ in the print destination.");
    window.requestAnimationFrame(() => window.print());
  }

  async function syncDashboard(tab: WorkflowTab, selectedId: string) {
    try {
      const response = await fetch("/api/invoices", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        invoices?: InvoiceRow[];
        workflows?: InvoiceWorkflows;
      };
      if (!response.ok || !data.invoices || !data.workflows) throw new Error(data.error ?? "Could not refresh data.");
      setIssuedInvoices(data.invoices);
      setWorkflowRows(data.workflows);
      selectWorkflow(tab, selectedId);
    } catch {
      toast.warning("The change was saved, but the latest data could not be reloaded. Refresh the page.");
    }
  }

  function openPaymentConfirmation(row: InvoiceWorkflowRow) {
    setPaymentDialogRow(row);
    setPaymentMethod(normalizedPaymentMethod(row.payment_method));
    setPaymentReference(row.payment_reference ?? "");
    setPaymentNotes(row.payment_notes ?? "");
  }

  async function confirmPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentDialogRow || busy) return;
    if (paymentMethod === "Bank transfer" && !paymentReference.trim()) {
      toast.error("A bank transfer reference is required.");
      return;
    }

    const row = paymentDialogRow;
    setPendingKey(`payment:${row.id}`);
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
        created?: boolean;
      };
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Could not confirm customer payment.");

      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      setWorkflowRows((current) => ({
        ...current,
        payment: current.payment.map((item) =>
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
      }));
      setPaymentDialogRow(null);
      toast.success(result.confirmed ? "Payment confirmed and invoice generated." : "Invoice is ready.");
      await syncDashboard("payment", row.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not confirm customer payment.");
    } finally {
      setPendingKey(null);
    }
  }

  async function generateDocument(row: InvoiceWorkflowRow) {
    if (busy) return;
    const tab: WorkflowTab = row.type === "customer" ? "payment" : "business";
    setPendingKey(`invoice:${row.id}`);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: row.type, sourceId: row.id }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; invoice?: InvoiceRow };
      if (!response.ok || !result.invoice) throw new Error(result.error ?? "Could not generate the document.");

      setIssuedInvoices((current) => upsertInvoice(current, result.invoice as InvoiceRow));
      setWorkflowRows((current) => ({
        ...current,
        [tab]: current[tab].map((item) =>
          item.id === row.id
            ? {
                ...item,
                invoice_id: result.invoice?.id ?? null,
                invoice_number: result.invoice?.invoice_number ?? null,
                invoice_status: result.invoice?.status ?? null,
              }
            : item,
        ),
      }));
      toast.success(row.type === "customer" ? "Customer invoice generated." : "Payout invoice generated.");
      await syncDashboard(tab, row.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the document.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkflowTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
            </TabsList>

            <TabsContent value="payment">
              <PaymentWorkflow
                busy={busy}
                row={activeTab === "payment" ? selectedWorkflow : null}
                rows={workflowRows.payment}
                onSelect={(id) => selectWorkflow("payment", id)}
                onConfirm={openPaymentConfirmation}
                onGenerate={generateDocument}
              />
            </TabsContent>

            <TabsContent value="business">
              <BusinessWorkflow
                row={activeTab === "business" ? selectedWorkflow : null}
                rows={workflowRows.business}
                onSelect={(id) => selectWorkflow("business", id)}
              />
            </TabsContent>
          </Tabs>
        </div>

        <InvoicePreview invoice={selectedInvoice} onPrint={printInvoice} />
      </div>

      <Dialog
        open={Boolean(paymentDialogRow)}
        onOpenChange={(open) => {
          if (!open && !busy) setPaymentDialogRow(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={confirmPayment} className="contents">
            <DialogHeader>
              <DialogTitle>Confirm customer payment</DialogTitle>
              <DialogDescription>
                This records the payment and generates the customer invoice in one database transaction.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="customer-payment-method">Payment method</FieldLabel>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="customer-payment-method" className="w-full">
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
                <FieldLabel htmlFor="customer-payment-reference">
                  Transfer reference {paymentMethod === "Bank transfer" ? "*" : "(optional)"}
                </FieldLabel>
                <Input
                  id="customer-payment-reference"
                  value={paymentReference}
                  onChange={(event) => setPaymentReference(event.target.value)}
                  required={paymentMethod === "Bank transfer"}
                  aria-invalid={paymentMethod === "Bank transfer" && !paymentReference.trim()}
                  maxLength={120}
                  placeholder={
                    paymentMethod === "Bank transfer" ? "Bank transaction reference" : "Cash receipt reference"
                  }
                />
                <FieldDescription>Used for reconciliation and stored with the payment confirmation.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="customer-payment-notes">Confirmation notes</FieldLabel>
                <Input
                  id="customer-payment-notes"
                  value={paymentNotes}
                  onChange={(event) => setPaymentNotes(event.target.value)}
                  maxLength={500}
                  placeholder="Optional internal note"
                />
              </Field>
              {paymentDialogRow ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{paymentDialogRow.recipient_name}</p>
                    <p className="truncate text-muted-foreground text-xs">{paymentDialogRow.reference}</p>
                  </div>
                  <Badge variant="outline">{formatUsd(paymentDialogRow.amount_usd)}</Badge>
                </div>
              ) : null}
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={busy || (paymentMethod === "Bank transfer" && !paymentReference.trim())}>
                {busy ? <Spinner data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />}
                {busy ? "Confirming..." : "Confirm & generate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <InvoicePrintPortal invoice={selectedInvoice} />
    </>
  );
}
