"use client";

import { useState } from "react";

import { ClipboardCopy, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { AuditLogRow } from "../../_lib/admin-data";
import {
  formatLogAction,
  formatLogDateTime,
  formatLogEntity,
  formatLogSnapshot,
  getLogActionVariant,
} from "./log-format";

export function LogActions({ log }: { log: AuditLogRow }) {
  const [viewOpen, setViewOpen] = useState(false);

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`${label} could not be copied.`);
    }
  }

  return (
    <Dialog open={viewOpen} onOpenChange={setViewOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
            size="icon-sm"
            variant="ghost"
            aria-label={`Actions for log ${log.id}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuLabel>Log actions</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setViewOpen(true)}>
              <Eye />
              View details
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => void copyValue(log.id, "Log ID")}>
              <ClipboardCopy />
              Copy log ID
            </DropdownMenuItem>
            {log.entity_id ? (
              <DropdownMenuItem onSelect={() => void copyValue(log.entity_id ?? "", "Entity ID")}>
                <ClipboardCopy />
                Copy entity ID
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Log details</DialogTitle>
          <DialogDescription>Complete immutable event data stored in PostgreSQL.</DialogDescription>
        </DialogHeader>

        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>Event time</FieldLabel>
            <Input readOnly value={formatLogDateTime(log.created_at)} />
          </Field>
          <Field>
            <FieldLabel>Action</FieldLabel>
            <div>
              <Badge variant={getLogActionVariant(log.action)}>{formatLogAction(log.action)}</Badge>
            </div>
          </Field>
          <Field>
            <FieldLabel>Actor</FieldLabel>
            <Input readOnly value={log.actor_name ?? "System"} />
          </Field>
          <Field>
            <FieldLabel>Actor email</FieldLabel>
            <Input readOnly value={log.actor_email ?? "-"} />
          </Field>
          <Field>
            <FieldLabel>Entity type</FieldLabel>
            <Input readOnly value={formatLogEntity(log.entity_type)} />
          </Field>
          <Field>
            <FieldLabel>Entity ID</FieldLabel>
            <Input className="font-mono text-xs" readOnly value={log.entity_id ?? "-"} />
          </Field>
          <Field>
            <FieldLabel>Log ID</FieldLabel>
            <Input className="font-mono text-xs" readOnly value={log.id} />
          </Field>
          <Field>
            <FieldLabel>Actor ID</FieldLabel>
            <Input className="font-mono text-xs" readOnly value={log.actor_id ?? "System"} />
          </Field>
          <Field>
            <FieldLabel>IP address</FieldLabel>
            <Input className="font-mono text-xs" readOnly value={log.ip_address ?? "-"} />
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel>User agent</FieldLabel>
            <Textarea className="min-h-20 resize-none" readOnly value={log.user_agent ?? "Not recorded"} />
          </Field>
          <Field>
            <FieldLabel>Before snapshot</FieldLabel>
            <Textarea
              className="h-56 resize-none overflow-auto font-mono text-xs"
              readOnly
              value={formatLogSnapshot(log.before_data)}
            />
          </Field>
          <Field>
            <FieldLabel>After snapshot</FieldLabel>
            <Textarea
              className="h-56 resize-none overflow-auto font-mono text-xs"
              readOnly
              value={formatLogSnapshot(log.after_data)}
            />
          </Field>
        </FieldGroup>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
