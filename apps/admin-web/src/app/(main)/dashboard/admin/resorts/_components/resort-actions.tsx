"use client";

import { type FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { CirclePlay, Eye, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

import type { ResortRow } from "../../_lib/admin-data";
import { titleCase } from "../../_lib/format";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function coordinate(value: string | number | null) {
  return value == null || value === "" ? "-" : String(value);
}

export function ResortActions({ resort }: { resort: ResortRow }) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const isActive = resort.status === "active";
  const canActivate = resort.active_internal_count > 0 && resort.active_external_count > 0;
  const canDeactivate = resort.open_bookings_count === 0;
  const statusActionAllowed = isActive ? canDeactivate : canActivate;
  const busy = statusPending || editPending || deletePending;

  const statusActionLabel = isActive
    ? canDeactivate
      ? "Deactivate resort"
      : "Complete open bookings first"
    : canActivate
      ? "Activate resort"
      : "Complete staff coverage first";

  async function updateStatus() {
    if (!statusActionAllowed) return;
    setStatusPending(true);
    try {
      const nextStatus = isActive ? "inactive" : "active";
      const response = await fetch(`/api/resorts/${resort.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The resort status could not be updated.");

      toast.success(`${resort.name} was ${nextStatus === "active" ? "activated" : "deactivated"}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The resort status could not be updated.");
    } finally {
      setStatusPending(false);
    }
  }

  async function updateResort(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const slug = String(form.get("slug") ?? "").trim();
    setEditPending(true);

    try {
      const response = await fetch(`/api/resorts/${resort.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          code: form.get("code"),
          slug: slug || undefined,
          location: form.get("location"),
          timezone: form.get("timezone"),
          contactName: form.get("contactName"),
          contactPhone: form.get("contactPhone"),
          contactEmail: String(form.get("contactEmail") ?? "").trim() || null,
          whatsappNumber: form.get("whatsappNumber"),
          observationSpots: form.get("observationSpots"),
          latitude: form.get("latitude"),
          longitude: form.get("longitude"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The resort could not be updated.");

      toast.success(`${resort.name} was updated.`);
      setEditOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The resort could not be updated.");
    } finally {
      setEditPending(false);
    }
  }

  async function deleteResort() {
    setDeletePending(true);
    try {
      const response = await fetch(`/api/resorts/${resort.id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The resort could not be deleted.");

      toast.success(`${resort.name} was deleted.`);
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The resort could not be deleted.");
    } finally {
      setDeletePending(false);
    }
  }

  const fieldId = (name: string) => `${name}-${resort.id}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
            size="icon-sm"
            variant="ghost"
            disabled={busy}
            aria-label={`Actions for ${resort.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel>Resort actions</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setViewOpen(true)}>
              <Eye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              className="whitespace-nowrap"
              disabled={!statusActionAllowed}
              onSelect={() => void updateStatus()}
            >
              {isActive ? <Power /> : <CirclePlay />}
              {statusActionLabel}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{resort.name}</DialogTitle>
            <DialogDescription>{resort.code} - Partner resort details from PostgreSQL.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <div>
                <Badge variant={resort.status === "active" ? "default" : "secondary"}>
                  {titleCase(resort.status)}
                </Badge>
              </div>
            </Field>
            <Field>
              <FieldLabel>Coverage</FieldLabel>
              <div>
                <Badge variant={resort.coverage_status === "ready" ? "default" : "outline"}>
                  {titleCase(resort.coverage_status)}
                </Badge>
              </div>
            </Field>
            <Field>
              <FieldLabel>Code</FieldLabel>
              <Input readOnly value={resort.code} />
            </Field>
            <Field>
              <FieldLabel>Slug</FieldLabel>
              <Input readOnly value={resort.slug ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Location</FieldLabel>
              <Input readOnly value={resort.location || "-"} />
            </Field>
            <Field>
              <FieldLabel>Timezone</FieldLabel>
              <Input readOnly value={resort.timezone} />
            </Field>
            <Field>
              <FieldLabel>Contact name</FieldLabel>
              <Input readOnly value={resort.contact_name ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Contact phone</FieldLabel>
              <Input readOnly value={resort.contact_phone ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Contact email</FieldLabel>
              <Input readOnly value={resort.contact_email ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>WhatsApp</FieldLabel>
              <Input readOnly value={resort.whatsapp_number ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Coordinates</FieldLabel>
              <Input readOnly value={`${coordinate(resort.latitude)}, ${coordinate(resort.longitude)}`} />
            </Field>
            <Field>
              <FieldLabel>Active staff</FieldLabel>
              <Input
                readOnly
                value={`${resort.active_internal_count} internal, ${resort.active_external_count} external`}
              />
            </Field>
            <Field>
              <FieldLabel>Total bookings</FieldLabel>
              <Input readOnly value={`${resort.total_bookings_count}`} />
            </Field>
            <Field>
              <FieldLabel>Open bookings</FieldLabel>
              <Input readOnly value={`${resort.open_bookings_count}`} />
            </Field>
            <Field>
              <FieldLabel>Created</FieldLabel>
              <Input readOnly value={formatDateTime(resort.created_at)} />
            </Field>
            <Field>
              <FieldLabel>Last updated</FieldLabel>
              <Input readOnly value={formatDateTime(resort.updated_at)} />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel>Observation spots</FieldLabel>
              <Textarea readOnly value={resort.observation_spots || "No observation spots recorded"} />
            </Field>
          </FieldGroup>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form className="flex flex-col gap-4" onSubmit={updateResort}>
            <DialogHeader>
              <DialogTitle>Edit partner resort</DialogTitle>
              <DialogDescription>Update resort identity, contact details, location, and observation data.</DialogDescription>
            </DialogHeader>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={fieldId("resort-name")}>Name</FieldLabel>
                <Input id={fieldId("resort-name")} name="name" defaultValue={resort.name} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-code")}>Code</FieldLabel>
                <Input id={fieldId("resort-code")} name="code" defaultValue={resort.code} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-slug")}>Slug</FieldLabel>
                <Input id={fieldId("resort-slug")} name="slug" defaultValue={resort.slug ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-location")}>Location</FieldLabel>
                <Input
                  id={fieldId("resort-location")}
                  name="location"
                  defaultValue={resort.location}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-timezone")}>Timezone IANA</FieldLabel>
                <Input
                  id={fieldId("resort-timezone")}
                  name="timezone"
                  defaultValue={resort.timezone}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-contact")}>Contact name</FieldLabel>
                <Input
                  id={fieldId("resort-contact")}
                  name="contactName"
                  defaultValue={resort.contact_name ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-phone")}>Contact phone</FieldLabel>
                <Input
                  id={fieldId("resort-phone")}
                  name="contactPhone"
                  defaultValue={resort.contact_phone ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-email")}>Contact email</FieldLabel>
                <Input
                  id={fieldId("resort-email")}
                  name="contactEmail"
                  type="email"
                  defaultValue={resort.contact_email ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-whatsapp")}>WhatsApp</FieldLabel>
                <Input
                  id={fieldId("resort-whatsapp")}
                  name="whatsappNumber"
                  defaultValue={resort.whatsapp_number ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-latitude")}>Latitude</FieldLabel>
                <Input
                  id={fieldId("resort-latitude")}
                  name="latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="0.000001"
                  defaultValue={resort.latitude == null ? "" : Number(resort.latitude)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("resort-longitude")}>Longitude</FieldLabel>
                <Input
                  id={fieldId("resort-longitude")}
                  name="longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="0.000001"
                  defaultValue={resort.longitude == null ? "" : Number(resort.longitude)}
                  required
                />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={fieldId("resort-spots")}>Observation spots</FieldLabel>
                <Textarea
                  id={fieldId("resort-spots")}
                  name="observationSpots"
                  defaultValue={resort.observation_spots}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={editPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={editPending}>
                {editPending && <Spinner data-icon="inline-start" />}
                {editPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {resort.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the resort. Deletion is blocked while staff, packages, bookings, payouts, or
              calendar events are still linked to it. Use Deactivate when historical data must be retained.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void deleteResort();
              }}
            >
              {deletePending && <Spinner data-icon="inline-start" />}
              {deletePending ? "Deleting..." : "Delete resort"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
