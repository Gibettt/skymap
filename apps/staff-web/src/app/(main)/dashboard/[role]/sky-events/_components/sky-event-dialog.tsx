"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import type { SkyEvent, SkyPackage } from "./sky-events";

type EventForm = {
  title: string;
  eventType: "astronomy" | "meteor" | "resort";
  startsAt: string;
  endsAt: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string;
  packageId: string;
  observationSpot: string;
  capacity: string;
  priceOverrideUsd: string;
  status: "draft" | "published" | "cancelled" | "sold_out";
  visibility: "north" | "south" | "both";
};

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function initialForm(event?: SkyEvent | null): EventForm {
  const tomorrow = new Date(Date.now() + 86_400_000);
  tomorrow.setHours(20, 0, 0, 0);
  return {
    title: event?.title ?? "",
    eventType: event?.eventType ?? "astronomy",
    startsAt: toLocalDateTime(event?.startsAt ?? tomorrow.toISOString()),
    endsAt: toLocalDateTime(event?.endsAt),
    description: event?.description ?? "",
    sourceName: event?.sourceName ?? "",
    sourceUrl: event?.sourceUrl ?? "",
    imageUrl: event?.imageUrl ?? "",
    packageId: event?.packageId ?? "none",
    observationSpot: event?.observationSpot ?? "",
    capacity: event?.capacity == null ? "" : String(event.capacity),
    priceOverrideUsd: event?.priceOverrideUsd == null ? "" : String(event.priceOverrideUsd),
    status: event?.status ?? "published",
    visibility: event?.visibility ?? "both",
  };
}

export function SkyEventDialog({
  open,
  onOpenChange,
  event,
  packages,
  observationSpots,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SkyEvent | null;
  packages: SkyPackage[];
  observationSpots: string[];
  saving: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<EventForm>(() => initialForm(event));

  useEffect(() => {
    if (open) setForm(initialForm(event));
  }, [event, open]);

  const update = <Key extends keyof EventForm>(key: Key, value: EventForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    await onSave({
      title: form.title,
      eventType: form.eventType,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : "",
      description: form.description,
      sourceName: form.sourceName,
      sourceUrl: form.sourceUrl,
      imageUrl: form.imageUrl,
      packageId: form.packageId === "none" ? null : form.packageId,
      observationSpot: form.observationSpot,
      capacity: form.capacity ? Number(form.capacity) : null,
      priceOverrideUsd: form.priceOverrideUsd ? Number(form.priceOverrideUsd) : null,
      status: form.status,
      visibility: form.visibility,
      isPublished: form.status === "published",
    });
  };

  let submitLabel = event ? "Save changes" : "Create event";
  if (saving) submitLabel = "Saving…";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event ? "Edit sky event" : "Create sky event"}</DialogTitle>
          <DialogDescription>Add the schedule and operational details shown to the resort team.</DialogDescription>
        </DialogHeader>
        <form id="sky-event-form" onSubmit={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="sky-title">Title</FieldLabel>
              <Input
                id="sky-title"
                value={form.title}
                maxLength={120}
                required
                onChange={(e) => update("title", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="sky-event-type">Event type</FieldLabel>
                <Select
                  value={form.eventType}
                  onValueChange={(value) => update("eventType", value as EventForm["eventType"])}
                >
                  <SelectTrigger id="sky-event-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="astronomy">Astronomy</SelectItem>
                    <SelectItem value="meteor">Meteor</SelectItem>
                    <SelectItem value="resort">Resort</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="sky-visibility">Visibility</FieldLabel>
                <Select
                  value={form.visibility}
                  onValueChange={(value) => update("visibility", value as EventForm["visibility"])}
                >
                  <SelectTrigger id="sky-visibility" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both hemispheres</SelectItem>
                    <SelectItem value="north">Northern hemisphere</SelectItem>
                    <SelectItem value="south">Southern hemisphere</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="sky-start">Starts at</FieldLabel>
                <Input
                  id="sky-start"
                  type="datetime-local"
                  value={form.startsAt}
                  required
                  onChange={(e) => update("startsAt", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sky-end">Ends at</FieldLabel>
                <Input
                  id="sky-end"
                  type="datetime-local"
                  value={form.endsAt}
                  min={form.startsAt || undefined}
                  onChange={(e) => update("endsAt", e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="sky-description">Description</FieldLabel>
              <Textarea
                id="sky-description"
                rows={3}
                maxLength={1500}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="sky-package">Package</FieldLabel>
                <Select value={form.packageId} onValueChange={(value) => update("packageId", value)}>
                  <SelectTrigger id="sky-package" className="w-full">
                    <SelectValue placeholder="No linked package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked package</SelectItem>
                    {packages.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="sky-spot">Observation spot</FieldLabel>
                <Input
                  id="sky-spot"
                  list="observation-spots"
                  value={form.observationSpot}
                  maxLength={120}
                  onChange={(e) => update("observationSpot", e.target.value)}
                />
                <datalist id="observation-spots">
                  {observationSpots.map((spot) => (
                    <option value={spot} key={spot} />
                  ))}
                </datalist>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="sky-capacity">Capacity</FieldLabel>
                <Input
                  id="sky-capacity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.capacity}
                  onChange={(e) => update("capacity", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sky-price">Price override (USD)</FieldLabel>
                <Input
                  id="sky-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.priceOverrideUsd}
                  onChange={(e) => update("priceOverrideUsd", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sky-status">Status</FieldLabel>
                <Select value={form.status} onValueChange={(value) => update("status", value as EventForm["status"])}>
                  <SelectTrigger id="sky-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="sold_out">Sold out</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="sky-source-name">Source name</FieldLabel>
                <Input
                  id="sky-source-name"
                  value={form.sourceName}
                  maxLength={120}
                  onChange={(e) => update("sourceName", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sky-source-url">Source URL</FieldLabel>
                <Input
                  id="sky-source-url"
                  type="url"
                  value={form.sourceUrl}
                  maxLength={500}
                  onChange={(e) => update("sourceUrl", e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="sky-image-url">Image URL</FieldLabel>
              <Input
                id="sky-image-url"
                type="url"
                value={form.imageUrl}
                maxLength={500}
                onChange={(e) => update("imageUrl", e.target.value)}
              />
              <FieldDescription>Optional public HTTP or HTTPS image.</FieldDescription>
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter showCloseButton>
          <Button type="submit" form="sky-event-form" disabled={saving}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
