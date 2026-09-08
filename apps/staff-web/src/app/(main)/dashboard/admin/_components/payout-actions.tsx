"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

import { Check, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function PayoutActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function update(nextStatus: string) {
    setPending(true);
    const response = await fetch(`/api/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setPending(false);
    if (!response.ok) {
      toast.error(result.error ?? "Payout gagal diperbarui.");
      return;
    }
    toast.success("Status payout diperbarui.");
    router.refresh();
  }

  if (!["requested", "processed"].includes(status)) return null;
  const nextStatus = status === "requested" ? "processed" : "completed";

  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="outline" onClick={() => update(nextStatus)} disabled={pending}>
        <Check data-icon="inline-start" />
        {status === "requested" ? "Proses" : "Selesaikan"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="icon-sm" variant="destructive" disabled={pending}>
            <X />
            <span className="sr-only">Tolak payout</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tolak permintaan payout?</AlertDialogTitle>
            <AlertDialogDescription>
              Status payout akan ditutup sebagai rejected dan tindakan ini tercatat di audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => update("rejected")}>
              Tolak payout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
