"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { CheckCircle2, CircleX, MoreHorizontal, Workflow } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

type PayoutAction = "processed" | "completed" | "rejected";

const ACTION_COPY: Record<
  PayoutAction,
  { button: string; description: string; pending: string; success: string; title: string }
> = {
  processed: {
    button: "Process payout",
    description:
      "Use this after validating the staff member, payout amount, and bank details. No payment is recorded at this stage.",
    pending: "Processing...",
    success: "Payout moved to processing.",
    title: "Move payout to processing?",
  },
  completed: {
    button: "Confirm as paid",
    description:
      "Confirm only after the transfer is complete. The paid timestamp and payout invoice will be created in the same transaction.",
    pending: "Confirming...",
    success: "Payout confirmed and invoice issued.",
    title: "Confirm payout as paid?",
  },
  rejected: {
    button: "Reject payout",
    description: "The request will be closed as rejected. This action is recorded in the audit log.",
    pending: "Rejecting...",
    success: "Payout rejected.",
    title: "Reject payout request?",
  },
};

function ActionIcon({ action }: { action: PayoutAction }) {
  if (action === "processed") return <Workflow data-icon="inline-start" />;
  if (action === "rejected") return <CircleX data-icon="inline-start" />;
  return <CheckCircle2 data-icon="inline-start" />;
}

export function PayoutActions({
  adminNotes,
  amountUsd,
  id,
  requesterName,
  status,
}: {
  adminNotes?: string | null;
  amountUsd: string | number;
  id: string;
  requesterName: string;
  status: string;
}) {
  const router = useRouter();
  const [action, setAction] = useState<PayoutAction | null>(null);
  const [notes, setNotes] = useState(adminNotes ?? "");
  const [pending, setPending] = useState(false);

  if (!["requested", "processed"].includes(status)) return null;

  const copy = action ? ACTION_COPY[action] : null;

  function openAction(nextAction: PayoutAction) {
    setNotes(adminNotes ?? "");
    setAction(nextAction);
  }

  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || pending) return;

    setPending(true);
    try {
      const response = await fetch(`/api/payouts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, adminNotes: notes }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The payout could not be updated.");

      toast.success(ACTION_COPY[action].success);
      setAction(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The payout could not be updated.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" disabled={pending}>
            {pending ? <Spinner /> : <MoreHorizontal />}
            <span className="sr-only">Open payout actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Payout actions</DropdownMenuLabel>
          <DropdownMenuGroup>
            {status === "requested" ? (
              <DropdownMenuItem onSelect={() => openAction("processed")}>
                <Workflow />
                Process payout
              </DropdownMenuItem>
            ) : null}
            {status === "processed" ? (
              <DropdownMenuItem onSelect={() => openAction("completed")}>
                <CheckCircle2 />
                Confirm as paid
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => openAction("rejected")}>
            <CircleX />
            Reject payout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={Boolean(action)}
        onOpenChange={(open) => {
          if (!open && !pending) setAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form className="contents" onSubmit={update}>
            <DialogHeader>
              <DialogTitle>{copy?.title ?? "Payout action"}</DialogTitle>
              <DialogDescription>{copy?.description}</DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{requesterName}</p>
                <p className="truncate text-muted-foreground text-xs">Payout {id.slice(-8).toUpperCase()}</p>
              </div>
              <Badge variant="outline">
                {formatCurrency(Number(amountUsd), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Badge>
            </div>

            <Field>
              <FieldLabel htmlFor={`payout-notes-${id}`}>Admin notes</FieldLabel>
              <Textarea
                id={`payout-notes-${id}`}
                className="min-h-20 resize-none"
                maxLength={500}
                placeholder="Optional reconciliation or review note"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <FieldDescription>
                Visible to authorized finance administrators and stored with this payout.
              </FieldDescription>
            </Field>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant={action === "rejected" ? "destructive" : "default"} disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                {!pending && action ? <ActionIcon action={action} /> : null}
                {pending ? copy?.pending : copy?.button}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
