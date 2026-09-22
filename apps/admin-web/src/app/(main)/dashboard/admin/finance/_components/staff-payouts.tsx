import Link from "next/link";

import { CheckCircle2, CircleX, Clock3, HandCoins, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

import { PayoutActions } from "../../_components/payout-actions";
import type { PayoutRow } from "../../_lib/admin-data";

function money(value: string | number | null | undefined) {
  return formatCurrency(Number(value ?? 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function roleLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function maskedAccount(value: string) {
  const account = value.trim();
  if (account.length <= 4) return account || "Not provided";
  return `•••• ${account.slice(-4)}`;
}

function PayoutStatus({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <Badge>
        <CheckCircle2 data-icon="inline-start" />
        Completed
      </Badge>
    );
  }
  if (status === "processed") {
    return (
      <Badge variant="secondary">
        <Workflow data-icon="inline-start" />
        Processing
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive">
        <CircleX data-icon="inline-start" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Clock3 data-icon="inline-start" />
      Requested
    </Badge>
  );
}

export function StaffPayouts({ payouts }: { payouts: PayoutRow[] }) {
  const openCount = payouts.filter((payout) => ["requested", "processed"].includes(payout.status)).length;

  return (
    <Card id="payouts" className="scroll-mt-4">
      <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <CardTitle>Staff Payout Queue</CardTitle>
        <CardDescription>
          Validate requests here, move them to processing, and confirm payment only after the transfer succeeds.
        </CardDescription>
        <CardAction className="col-start-1 row-start-auto mt-2 flex items-center gap-2 sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:mt-0">
          <Badge variant={openCount ? "secondary" : "outline"}>{openCount} open</Badge>
          <Badge variant="outline">{payouts.length} total</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
        {payouts.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Request</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((payout) => {
                const isOpen = ["requested", "processed"].includes(payout.status);
                const activityAt = payout.paid_at ?? payout.reviewed_at;

                return (
                  <TableRow key={payout.id}>
                    <TableCell className="pl-4">
                      <div className="font-medium">PAY-{payout.id.slice(-8).toUpperCase()}</div>
                      <div className="text-muted-foreground text-xs">
                        {dateTime(payout.created_at) ?? "Unknown date"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-52">
                        <div className="truncate font-medium">{payout.requester_name}</div>
                        <div className="truncate text-muted-foreground text-xs">{payout.requester_email}</div>
                        <div className="truncate text-muted-foreground text-xs">
                          {roleLabel(payout.requester_role)} · {payout.resort_name ?? "Internal operations"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium tabular-nums">{money(payout.amount_usd)}</div>
                      <div className="text-muted-foreground text-xs tabular-nums">
                        {money(payout.commission_usd)} commission · {money(payout.star_bonus_usd)} reward
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-44">
                        <div className="truncate font-medium">{payout.bank_name}</div>
                        <div className="truncate text-muted-foreground text-xs">{payout.account_holder_name}</div>
                        <div className="text-muted-foreground text-xs tabular-nums">
                          {maskedAccount(payout.account_number)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <PayoutStatus status={payout.status} />
                      {activityAt ? (
                        <div className="mt-1 text-muted-foreground text-xs">{dateTime(activityAt)}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-44">
                        <div className="truncate text-xs">
                          {payout.reviewed_by_name ?? (isOpen ? "Awaiting review" : "Not recorded")}
                        </div>
                        {payout.admin_notes ? (
                          <div className="truncate text-muted-foreground text-xs" title={payout.admin_notes}>
                            {payout.admin_notes}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {payout.invoice_number ? (
                        <Badge variant="outline" asChild>
                          <Link href={`/dashboard/admin/invoices?payout=${encodeURIComponent(payout.id)}`}>
                            {payout.invoice_number}
                          </Link>
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {payout.status === "completed" ? "Unavailable" : "After payment"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      {isOpen ? (
                        <PayoutActions
                          id={payout.id}
                          status={payout.status}
                          requesterName={payout.requester_name}
                          amountUsd={payout.amount_usd}
                          adminNotes={payout.admin_notes}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Empty className="min-h-56 border-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HandCoins />
              </EmptyMedia>
              <EmptyTitle>No payout requests</EmptyTitle>
              <EmptyDescription>Staff payout requests will appear here after they are submitted.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
