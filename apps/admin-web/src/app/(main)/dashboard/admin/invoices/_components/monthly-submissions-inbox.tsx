"use client";

import * as React from "react";

import { CheckCircle2, Download, Eye, Inbox, Printer, RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

import type { MonthlyInvoiceSubmissionRow } from "../../_lib/admin-data";
import { formatUsd } from "../../_lib/format";
import {
  SUBMITTED_MONTHLY_PAPER_HEIGHT,
  SUBMITTED_MONTHLY_PAPER_WIDTH,
  SubmittedMonthlyInvoiceDocument,
} from "./submitted-monthly-invoice-document";

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

function ReviewActionIcon({ pending, reviewed }: { pending: boolean; reviewed: boolean }) {
  if (pending) return <Spinner data-icon="inline-start" />;
  if (reviewed) return <RotateCcw data-icon="inline-start" />;
  return <CheckCircle2 data-icon="inline-start" />;
}

function usePaperScale(containerRef: React.RefObject<HTMLDivElement | null>, key: string | undefined) {
  const [scale, setScale] = React.useState(0.8);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => {
      const availableWidth = Math.max(240, container.clientWidth - 32);
      setScale(Math.min(0.9, availableWidth / SUBMITTED_MONTHLY_PAPER_WIDTH));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, key]);

  return scale;
}

function SubmissionPrintPortal({ submission }: { submission: MonthlyInvoiceSubmissionRow | null }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted || !submission) return null;
  return createPortal(
    <div data-print-root data-print-kind="monthly">
      <SubmittedMonthlyInvoiceDocument submission={submission} />
    </div>,
    document.body,
  );
}

export function MonthlySubmissionsInbox({ initialSubmissions }: { initialSubmissions: MonthlyInvoiceSubmissionRow[] }) {
  const [submissions, setSubmissions] = React.useState(initialSubmissions);
  const [selected, setSelected] = React.useState<MonthlyInvoiceSubmissionRow | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [printSubmission, setPrintSubmission] = React.useState<MonthlyInvoiceSubmissionRow | null>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const previewScale = usePaperScale(previewRef, selected?.id);

  React.useEffect(() => {
    const clearPrintSubmission = () => setPrintSubmission(null);
    window.addEventListener("afterprint", clearPrintSubmission);
    return () => window.removeEventListener("afterprint", clearPrintSubmission);
  }, []);

  function printInvoice(pdf: boolean) {
    if (!selected) return;
    setPrintSubmission(selected);
    if (pdf) toast.info("Choose ‘Save as PDF’ in the print destination.");
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()));
  }

  async function toggleReviewed(submission: MonthlyInvoiceSubmissionRow) {
    if (pendingId) return;
    setPendingId(submission.id);
    try {
      const response = await fetch(`/api/monthly-invoices/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewed: submission.status !== "reviewed" }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        submission?: MonthlyInvoiceSubmissionRow;
      };
      if (!response.ok || !result.submission) throw new Error(result.error ?? "Could not update the submission.");
      setSubmissions((current) =>
        current.map((item) => (item.id === submission.id ? (result.submission as MonthlyInvoiceSubmissionRow) : item)),
      );
      setSelected((current) =>
        current?.id === submission.id ? (result.submission as MonthlyInvoiceSubmissionRow) : current,
      );
      toast.success(
        result.submission.status === "reviewed" ? "Monthly invoice marked as reviewed." : "Monthly invoice reopened.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the submission.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Inbox className="size-5" />
              <h2 className="font-semibold text-lg">Monthly submissions</h2>
              <Badge variant="outline">
                {submissions.filter((item) => item.status === "submitted").length} waiting
              </Badge>
            </div>
            <p className="mt-1 text-muted-foreground text-sm">
              Monthly customer invoice bundles sent by Internal Staff for Admin review.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-muted/60 text-left text-muted-foreground text-xs uppercase">
              <tr>
                <th className="p-3">Month</th>
                <th className="p-3">Resort</th>
                <th className="p-3">Submitted by</th>
                <th className="p-3">Invoices</th>
                <th className="p-3 text-right">Customer total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => {
                const total = submission.invoices.reduce((sum, invoice) => sum + invoice.total_usd, 0);
                return (
                  <tr key={submission.id} className="border-t transition-colors hover:bg-muted/40">
                    <td className="p-3 font-medium">{monthLabel(submission.period_start)}</td>
                    <td className="p-3">{submission.resort_name}</td>
                    <td className="p-3">
                      <p>{submission.submitted_by_name}</p>
                      <p className="text-muted-foreground text-xs">{formatDateTime(submission.submitted_at)}</p>
                    </td>
                    <td className="p-3">{submission.invoices.length}</td>
                    <td className="p-3 text-right font-medium">{formatUsd(total)}</td>
                    <td className="p-3">
                      <Badge variant={submission.status === "reviewed" ? "default" : "outline"}>
                        {submission.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button type="button" size="sm" variant="outline" onClick={() => setSelected(submission)}>
                        <Eye data-icon="inline-start" />
                        Open
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {!submissions.length ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No monthly invoice submissions have been sent yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[94svh] overflow-y-auto sm:!max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {selected ? `${selected.resort_name} · ${monthLabel(selected.period_start)}` : "Monthly submission"}
            </DialogTitle>
            <DialogDescription>
              Monthly customer invoices signed and submitted by the responsible Internal Staff member.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                <div>
                  <p className="font-medium">Invoice received from {selected.submitted_by_name}</p>
                  <p className="text-muted-foreground text-xs">Submitted {formatDateTime(selected.submitted_at)}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => printInvoice(false)}>
                    <Printer data-icon="inline-start" /> Print
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => printInvoice(true)}>
                    <Download data-icon="inline-start" /> PDF
                  </Button>
                </div>
              </div>

              <div ref={previewRef} className="relative min-h-[45rem] overflow-hidden rounded-xl border bg-[#132f55] p-4">
                <div
                  style={{
                    height: SUBMITTED_MONTHLY_PAPER_HEIGHT * previewScale,
                    width: SUBMITTED_MONTHLY_PAPER_WIDTH * previewScale,
                  }}
                  className="mx-auto shadow-2xl"
                >
                  <div style={{ transform: `scale(${previewScale})` }} className="origin-top-left">
                    <SubmittedMonthlyInvoiceDocument submission={selected} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-muted-foreground text-sm">
                  {selected.status === "reviewed"
                    ? `Reviewed by ${selected.reviewed_by_name ?? "Admin"} on ${formatDateTime(selected.reviewed_at)}.`
                    : "Review the bundle, then mark it as reviewed."}
                </p>
                <Button
                  type="button"
                  variant={selected.status === "reviewed" ? "outline" : "default"}
                  disabled={pendingId === selected.id}
                  onClick={() => toggleReviewed(selected)}
                >
                  <ReviewActionIcon pending={pendingId === selected.id} reviewed={selected.status === "reviewed"} />
                  {selected.status === "reviewed" ? "Reopen" : "Mark reviewed"}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <SubmissionPrintPortal submission={printSubmission} />
    </>
  );
}
