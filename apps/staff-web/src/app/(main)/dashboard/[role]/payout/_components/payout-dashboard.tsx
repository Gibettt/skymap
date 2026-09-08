"use client";

import * as React from "react";

import { Banknote, CircleDollarSign, Clock3, RefreshCw, ShieldAlert, Sparkles, Star, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { formatDate, formatUsd, type StaffRole, staffApi, titleCase } from "../../_lib/staff-api";

const BANKS = ["Bank of Maldives", "Maldives Islamic Bank", "State Bank of India (Maldives)"] as const;

interface PayoutSummary {
  commissionUsd: number;
  starPoints: number;
  starUnits: number;
  fullStars: number;
  starBonusUsd: number;
  partialProgressUsd: number;
  starRewardUsd: number;
  earnedUsd: number;
  requestedOrPaidUsd: number;
  availableUsd: number;
  cycleStart: string;
  starThreshold: number;
}

interface PayoutRequest {
  id: string;
  amount_usd: number | string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  notes: string | null;
  admin_notes: string | null;
  status: "requested" | "processed" | "completed" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  paid_at: string | null;
}

interface PayoutResponse {
  summary: PayoutSummary;
  requests: PayoutRequest[];
}

interface PayoutForm {
  amountUsd: string;
  bankName: (typeof BANKS)[number];
  accountHolderName: string;
  accountNumber: string;
  notes: string;
}

const EMPTY_FORM: PayoutForm = {
  amountUsd: "",
  bankName: BANKS[0],
  accountHolderName: "",
  accountNumber: "",
  notes: "",
};

const PAYOUT_METRIC_SKELETONS = ["available", "earned", "reward", "reserved"] as const;
const PAYOUT_ROW_SKELETONS = ["first", "second", "third", "fourth", "fifth"] as const;
const MONTHLY_STAR_SLOTS = 5;
const MONTHLY_STAR_SLOT_IDS = ["star-one", "star-two", "star-three", "star-four", "star-five"] as const;

function payoutStatusVariant(status: PayoutRequest["status"]) {
  if (status === "completed") return "default" as const;
  if (status === "rejected") return "destructive" as const;
  if (status === "processed") return "secondary" as const;
  return "outline" as const;
}

function PayoutStatus({ status }: { status: PayoutRequest["status"] }) {
  return <Badge variant={payoutStatusVariant(status)}>{titleCase(status)}</Badge>;
}

function RewardStars({ completed, progress }: { completed: number; progress: number }) {
  const completedStars = Math.min(MONTHLY_STAR_SLOTS, Math.max(0, Math.floor(completed)));
  const nextStarProgress = Math.min(100, Math.max(0, progress));
  const progressLabel =
    completedStars >= MONTHLY_STAR_SLOTS
      ? `All ${MONTHLY_STAR_SLOTS} monthly stars completed`
      : `${completedStars} of ${MONTHLY_STAR_SLOTS} stars completed, ${nextStarProgress.toFixed(0)}% toward the next star`;

  return (
    <div className="flex items-center gap-2" role="img" aria-label={progressLabel}>
      {MONTHLY_STAR_SLOT_IDS.map((slotId, index) => {
        let fillPercentage = 0;
        if (index < completedStars) fillPercentage = 100;
        else if (index === completedStars) fillPercentage = nextStarProgress;

        return (
          <span key={slotId} className="relative size-7" aria-hidden="true">
            <Star className="absolute inset-0 size-full text-muted-foreground" strokeWidth={1.5} />
            {fillPercentage > 0 ? (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
                <Star className="size-7 fill-reward-star text-reward-star" strokeWidth={1.5} />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function PayoutLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PAYOUT_METRIC_SKELETONS.map((metric) => (
          <Card key={metric} size="sm">
            <CardHeader>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-24" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {PAYOUT_ROW_SKELETONS.map((row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PayoutHistory({ requests }: { requests: PayoutRequest[] }) {
  if (!requests.length) {
    return (
      <Empty className="min-h-64">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WalletCards />
          </EmptyMedia>
          <EmptyTitle>No payout requests yet</EmptyTitle>
          <EmptyDescription>Submitted payout requests and their review status will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Requested</TableHead>
              <TableHead>Bank account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin notes</TableHead>
              <TableHead className="pr-4 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="pl-4">{formatDate(request.created_at)}</TableCell>
                <TableCell>
                  <div className="flex min-w-48 flex-col gap-0.5">
                    <span className="font-medium">{request.bank_name}</span>
                    <span className="text-muted-foreground text-xs">
                      {request.account_holder_name} · {request.account_number}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <PayoutStatus status={request.status} />
                </TableCell>
                <TableCell className="max-w-64 whitespace-normal">{request.admin_notes || "—"}</TableCell>
                <TableCell className="pr-4 text-right font-medium tabular-nums">
                  {formatUsd(request.amount_usd)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 px-4 md:hidden">
        {requests.map((request) => (
          <Card key={request.id} size="sm">
            <CardHeader>
              <CardTitle>{formatUsd(request.amount_usd)}</CardTitle>
              <CardDescription>{formatDate(request.created_at)}</CardDescription>
              <CardAction>
                <PayoutStatus status={request.status} />
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <div>
                <p className="font-medium">{request.bank_name}</p>
                <p className="text-muted-foreground">
                  {request.account_holder_name} · {request.account_number}
                </p>
              </div>
              {request.admin_notes ? <p className="text-muted-foreground">Admin: {request.admin_notes}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

export function PayoutDashboard({ role, readOnly }: { role: StaffRole; readOnly: boolean }) {
  const [data, setData] = React.useState<PayoutResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState("");
  const [form, setForm] = React.useState<PayoutForm>(EMPTY_FORM);

  const loadPayouts = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await staffApi<PayoutResponse>("/api/payouts", { cache: "no-store" });
      setData(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payout data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const summary = data?.summary;
  const availableUsd = Number(summary?.availableUsd || 0);
  const starThreshold = Math.max(0.01, Number(summary?.starThreshold || 10));
  const starProgress = ((Number(summary?.starUnits || 0) % starThreshold) / starThreshold) * 100;

  function updateForm<Key extends keyof PayoutForm>(key: Key, value: PayoutForm[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleDialogChange(open: boolean) {
    if (open && (readOnly || availableUsd <= 0)) return;
    setDialogOpen(open);
    setFormError("");
    if (open) {
      setForm((current) => ({
        ...current,
        amountUsd: current.amountUsd || availableUsd.toFixed(2),
      }));
    }
  }

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;

    const amountUsd = Number(form.amountUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setFormError("Enter a payout amount greater than zero.");
      return;
    }
    if (Math.round(amountUsd * 100) > Math.round(availableUsd * 100)) {
      setFormError("The payout amount cannot exceed your available balance.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      await staffApi<{ payout: PayoutRequest }>("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amountUsd }),
      });
      toast.success("Payout request submitted for review.");
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      await loadPayouts();
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Unable to submit payout request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !data) return <PayoutLoading />;

  const metrics = [
    {
      label: "Available balance",
      value: formatUsd(availableUsd),
      detail: "Ready to request",
      icon: WalletCards,
    },
    {
      label: "Eligible commission",
      value: formatUsd(summary?.commissionUsd || 0),
      detail: "Completed and signed bookings",
      icon: CircleDollarSign,
    },
    {
      label: role === "external" ? "Monthly reward" : "Total earned",
      value: formatUsd(role === "external" ? summary?.starRewardUsd || 0 : summary?.earnedUsd || 0),
      detail:
        role === "external"
          ? `${summary?.fullStars || 0} of ${MONTHLY_STAR_SLOTS} stars completed`
          : "Commission eligible for payout",
      icon: role === "external" ? Star : Sparkles,
    },
    {
      label: "Requested or paid",
      value: formatUsd(summary?.requestedOrPaidUsd || 0),
      detail: "Reserved from your balance",
      icon: Clock3,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">Payouts</h1>
            <Badge variant="outline">{titleCase(role)} staff</Badge>
            {readOnly ? <Badge variant="secondary">Read only</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            Review your earned balance, reward progress, and payout request history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadPayouts()} disabled={loading}>
            {loading ? <Spinner data-icon="inline-start" /> : <RefreshCw data-icon="inline-start" />}
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button disabled={readOnly || availableUsd <= 0 || loading}>
                <Banknote data-icon="inline-start" />
                {readOnly ? "Read only" : "Request payout"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <form className="flex flex-col gap-4" onSubmit={submitRequest}>
                <DialogHeader>
                  <DialogTitle>Request a payout</DialogTitle>
                  <DialogDescription>
                    Submit bank details for review. Your current available balance is {formatUsd(availableUsd)}.
                  </DialogDescription>
                </DialogHeader>

                {formError ? (
                  <Alert variant="destructive">
                    <ShieldAlert />
                    <AlertTitle>Request could not be submitted</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                ) : null}

                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="payout-amount">Amount (USD)</FieldLabel>
                    <Input
                      id="payout-amount"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      max={availableUsd || undefined}
                      step="0.01"
                      value={form.amountUsd}
                      onChange={(event) => updateForm("amountUsd", event.target.value)}
                      required
                    />
                    <FieldDescription>Maximum available: {formatUsd(availableUsd)}</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="payout-bank">Bank</FieldLabel>
                    <Select
                      value={form.bankName}
                      onValueChange={(value) => {
                        if (value) updateForm("bankName", value as PayoutForm["bankName"]);
                      }}
                    >
                      <SelectTrigger id="payout-bank" className="w-full">
                        <SelectValue placeholder="Select a bank" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectGroup>
                          {BANKS.map((bank) => (
                            <SelectItem key={bank} value={bank}>
                              {bank}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="payout-holder">Account holder</FieldLabel>
                    <Input
                      id="payout-holder"
                      maxLength={120}
                      value={form.accountHolderName}
                      onChange={(event) => updateForm("accountHolderName", event.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="payout-account">Account number</FieldLabel>
                    <Input
                      id="payout-account"
                      maxLength={120}
                      value={form.accountNumber}
                      onChange={(event) => updateForm("accountNumber", event.target.value)}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="payout-notes">Notes</FieldLabel>
                    <Textarea
                      id="payout-notes"
                      maxLength={500}
                      placeholder="Optional information for the finance team"
                      value={form.notes}
                      onChange={(event) => updateForm("notes", event.target.value)}
                    />
                  </Field>
                </FieldGroup>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={submitting}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={submitting || availableUsd <= 0}>
                    {submitting ? <Spinner data-icon="inline-start" /> : <Banknote data-icon="inline-start" />}
                    {submitting ? "Submitting..." : "Submit request"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Payout data could not be loaded</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {readOnly ? (
        <Alert>
          <ShieldAlert />
          <AlertTitle>Read-only finance access</AlertTitle>
          <AlertDescription>
            You can review payout balances and history, but this access role cannot submit new requests.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
              <CardAction className="rounded-lg bg-muted p-2 text-muted-foreground">
                <Icon className="size-4" />
              </CardAction>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">{detail}</CardContent>
          </Card>
        ))}
      </div>

      {role === "external" ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>Monthly star progress</CardTitle>
            <CardDescription>
              Reward cycle started {formatDate(summary?.cycleStart)}. Every {starThreshold.toFixed(1)} units fills one
              star, with up to {MONTHLY_STAR_SLOTS} stars per cycle.
            </CardDescription>
            <CardAction>
              <Badge variant="outline">
                <Star className="fill-reward-star text-reward-star" />
                {Number(summary?.starUnits || 0).toFixed(1)} units
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <RewardStars completed={Number(summary?.fullStars || 0)} progress={starProgress} />
            <Progress value={starProgress} aria-label="Progress toward the next reward star" />
            <div className="flex flex-wrap justify-between gap-2 text-muted-foreground text-xs">
              <span>
                {summary?.fullStars || 0} of {MONTHLY_STAR_SLOTS} stars completed
              </span>
              <span>
                {Number(summary?.fullStars || 0) >= MONTHLY_STAR_SLOTS
                  ? "Monthly star goal completed"
                  : `${starProgress.toFixed(0)}% toward the next star`}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Payout history</CardTitle>
          <CardDescription>
            {data?.requests.length || 0} request{data?.requests.length === 1 ? "" : "s"} submitted from this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <PayoutHistory requests={data?.requests || []} />
        </CardContent>
      </Card>
    </div>
  );
}
