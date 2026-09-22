"use client";

import * as React from "react";

import { useCalendarController } from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import multiMonthPlugin from "@fullcalendar/react/multimonth";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { differenceInCalendarDays, endOfMonth, format, startOfMonth } from "date-fns";
import {
  Building2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { EventCalendarViews } from "@/components/calendar/event-calendar-views";
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
import { ButtonGroup } from "@/components/ui/button-group";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { PackageImageField, type PackageImageValue } from "../../_components/package-image-field";

import type { CalendarOptions } from "../../_lib/admin-data";

const views = [
  { key: "dayGridMonth", label: "Month" },
  { key: "timeGridWeek", label: "Week" },
  { key: "timeGridDay", label: "Day" },
  { key: "listMonth", label: "Agenda" },
] as const;

const calendars = [
  { key: "all", label: "All calendars" },
  { key: "booking", label: "Bookings" },
  { key: "sky_event", label: "Sky events" },
] as const;

const plugins = [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin];

type BookingEvent = {
  kind: "booking";
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  bookingCode: string;
  eventDate: string;
  timeStart: string | null;
  timeEnd: string | null;
  guestName: string;
  guestPhone: string | null;
  guestEmail: string | null;
  adultCount: number;
  childCount: number;
  status: string;
  invoiceTotalUsd: number;
  notes: string | null;
  resortId: string | null;
  resortName: string | null;
  packageName: string;
  staffName: string;
};

type SkyEvent = {
  kind: "sky_event";
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  eventType: string;
  description: string;
  sourceName: string;
  sourceUrl: string | null;
  visibility: "north" | "south" | "both";
  resortId: string;
  resortName: string;
  packageId: string | null;
  packageName: string | null;
  observationSpot: string;
  capacity: number | null;
  priceOverrideUsd: number | null;
  imageUrl: string | null;
  status: "draft" | "published" | "cancelled" | "sold_out";
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

type CalendarRecord = BookingEvent | SkyEvent;

type EventFormState = {
  title: string;
  eventType: SkyEvent["eventType"];
  startsAt: string;
  endsAt: string;
  resortId: string;
  packageId: string;
  observationSpot: string;
  capacity: string;
  priceOverrideUsd: string;
  status: SkyEvent["status"];
  visibility: SkyEvent["visibility"];
  description: string;
  sourceName: string;
  sourceUrl: string;
};

function dateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function newEventForm(resortId: string, date = new Date()): EventFormState {
  const start = new Date(date);
  if (start.getHours() === 0 && start.getMinutes() === 0) start.setHours(20, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  return {
    title: "",
    eventType: "astronomy",
    startsAt: dateTimeInput(start.toISOString()),
    endsAt: dateTimeInput(end.toISOString()),
    resortId,
    packageId: "none",
    observationSpot: "",
    capacity: "",
    priceOverrideUsd: "",
    status: "published",
    visibility: "both",
    description: "",
    sourceName: "",
    sourceUrl: "",
  };
}

function editEventForm(event: SkyEvent): EventFormState {
  return {
    title: event.title,
    eventType: event.eventType,
    startsAt: dateTimeInput(event.startsAt),
    endsAt: dateTimeInput(event.endsAt),
    resortId: event.resortId,
    packageId: event.packageId ?? "none",
    observationSpot: event.observationSpot,
    capacity: event.capacity == null ? "" : String(event.capacity),
    priceOverrideUsd: event.priceOverrideUsd == null ? "" : String(event.priceOverrideUsd),
    status: event.status,
    visibility: event.visibility,
    description: event.description,
    sourceName: event.sourceName,
    sourceUrl: event.sourceUrl ?? "",
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

async function responseError(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error || `Request failed with status ${response.status}`;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-sm">{value || "—"}</dd>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const variant = value === "cancelled" || value.startsWith("cancelled_")
    ? "destructive"
    : value === "published" || value === "active" || value === "completed"
      ? "default"
      : "outline";
  return <Badge variant={variant}>{humanize(value)}</Badge>;
}

export function Calendar({ options }: { options: CalendarOptions }) {
  const controller = useCalendarController();
  const isMobile = useIsMobile();
  const [records, setRecords] = React.useState<CalendarRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [selectedCalendar, setSelectedCalendar] = React.useState("all");
  const [selectedResort, setSelectedResort] = React.useState("all");
  const [range, setRange] = React.useState<{ start: string; end: string } | null>(null);
  const [dateInfo, setDateInfo] = React.useState(() => {
    const now = new Date();
    return {
      title: format(now, "MMMM yyyy"),
      days: differenceInCalendarDays(endOfMonth(now), startOfMonth(now)) + 1,
    };
  });
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState<CalendarRecord | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<SkyEvent | null>(null);
  const [form, setForm] = React.useState<EventFormState>(() => newEventForm(options.resorts[0]?.id ?? ""));
  const [saving, setSaving] = React.useState(false);
  const [eventImage, setEventImage] = React.useState<PackageImageValue>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!isMobile) return;
    const frame = window.requestAnimationFrame(() => controller.changeView("listMonth"));
    return () => window.cancelAnimationFrame(frame);
  }, [controller, isMobile]);

  React.useEffect(() => {
    void refreshKey;
    if (!range) return;
    const abortController = new AbortController();
    const parameters = new URLSearchParams({ start: range.start, end: range.end });
    if (selectedResort !== "all") parameters.set("resortId", selectedResort);

    setLoading(true);
    fetch(`/api/calendar?${parameters}`, { signal: abortController.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        return response.json();
      })
      .then((body) => setRecords(Array.isArray(body.events) ? body.events : []))
      .catch((error) => {
        if (error.name !== "AbortError") toast.error(error.message || "Could not load calendar events");
      })
      .finally(() => {
        if (!abortController.signal.aborted) setLoading(false);
      });

    return () => abortController.abort();
  }, [range, refreshKey, selectedResort]);

  const visibleRecords = React.useMemo(
    () => selectedCalendar === "all" ? records : records.filter((record) => record.kind === selectedCalendar),
    [records, selectedCalendar],
  );

  const calendarEvents = React.useMemo(
    () => visibleRecords.map((record) => ({
      id: `${record.kind}:${record.id}`,
      title: record.title,
      start: record.startsAt,
      end: record.endsAt || undefined,
      editable: record.kind === "sky_event",
      color: record.kind === "booking"
        ? "var(--chart-2)"
        : record.status === "cancelled"
          ? "var(--muted-foreground)"
          : "var(--primary)",
      contrastColor: record.kind === "booking" ? "var(--foreground)" : "var(--primary-foreground)",
      extendedProps: { record },
    })),
    [visibleRecords],
  );

  const preferredResortId = React.useMemo(() => {
    if (selectedResort !== "all") return selectedResort;
    return options.resorts.find((resort) => resort.status === "active")?.id || options.resorts[0]?.id || "";
  }, [options.resorts, selectedResort]);

  const availablePackages = React.useMemo(
    () => options.packages.filter((item) => item.resort_id === form.resortId && (item.is_active || item.id === form.packageId)),
    [form.packageId, form.resortId, options.packages],
  );

  const availableEventTypes = React.useMemo(() => {
    const types = new Map([
      ["astronomy", "Astronomy"],
      ["meteor", "Meteor"],
      ["resort", "Resort"],
    ]);
    for (const record of records) {
      if (record.kind === "sky_event" && record.resortId === form.resortId) {
        types.set(record.eventType, humanize(record.eventType));
      }
    }
    if (editingEvent) types.set(editingEvent.eventType, humanize(editingEvent.eventType));
    return [...types.entries()].map(([slug, name]) => ({ slug, name }));
  }, [editingEvent, form.resortId, records]);

  function openCreate(date = new Date()) {
    if (!preferredResortId) {
      toast.error("Create a resort before adding a sky event");
      return;
    }
    setEditingEvent(null);
    setForm(newEventForm(preferredResortId, date));
    setEventImage(undefined);
    setFormOpen(true);
  }

  function openEdit(event: SkyEvent) {
    setDetailsOpen(false);
    setEditingEvent(event);
    setForm(editEventForm(event));
    setEventImage(undefined);
    setFormOpen(true);
  }

  async function saveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.resortId) {
      toast.error("Resort is required");
      return;
    }
    if (!form.startsAt || !form.endsAt) {
      toast.error("Start and end time are required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editingEvent ? `/api/sky-events/${editingEvent.id}` : "/api/sky-events", {
        method: editingEvent ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          eventType: form.eventType,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          resortId: form.resortId,
          packageId: form.packageId === "none" ? null : form.packageId,
          observationSpot: form.observationSpot,
          capacity: form.capacity,
          priceOverrideUsd: form.priceOverrideUsd,
          status: form.status,
          visibility: form.visibility,
          description: form.description,
          sourceName: form.sourceName,
          sourceUrl: form.sourceUrl,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Request failed with status ${response.status}`);

      const eventId = editingEvent?.id ?? result.event?.id;
      if (eventId && eventImage !== undefined) {
        try {
          let imageResponse: Response;
          if (eventImage instanceof File) {
            const imageForm = new FormData();
            imageForm.set("image", eventImage);
            imageResponse = await fetch(`/api/sky-events/${eventId}/image`, { method: "PUT", body: imageForm });
          } else {
            imageResponse = await fetch(`/api/sky-events/${eventId}/image`, { method: "DELETE" });
          }
          if (!imageResponse.ok) throw new Error(await responseError(imageResponse));
        } catch (imageError) {
          toast.error(`Event saved, but image failed: ${imageError instanceof Error ? imageError.message : "Unknown error"}`);
        }
      }
      toast.success(editingEvent ? "Sky event updated" : "Sky event created");
      setFormOpen(false);
      setEditingEvent(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the sky event");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!selectedRecord || selectedRecord.kind !== "sky_event") return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/sky-events/${selectedRecord.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      toast.success("Sky event deleted");
      setDeleteOpen(false);
      setDetailsOpen(false);
      setSelectedRecord(null);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the sky event");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col overflow-hidden rounded-md border">
        <div className="flex flex-col gap-4 border-b bg-sidebar p-4 text-sidebar-foreground lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 shrink-0 flex-col gap-1">
            <div className="font-medium text-lg leading-none">{dateInfo.title}</div>
            <p className="text-muted-foreground text-sm">
              {dateInfo.days} days - {visibleRecords.length} events{loading ? " · Loading" : ""}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
              <SelectTrigger className="w-full sm:w-44">
                <CalendarIcon />
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {calendars.map((calendar) => (
                    <SelectItem key={calendar.key} value={calendar.key}>{calendar.label}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={selectedResort} onValueChange={setSelectedResort}>
              <SelectTrigger className="w-full sm:w-44">
                <Building2 />
                <SelectValue placeholder="All resorts" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="all">All resorts</SelectItem>
                  {options.resorts.map((resort) => (
                    <SelectItem key={resort.id} value={resort.id}>{resort.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <ButtonGroup className="w-full sm:w-auto">
              <Button aria-label="Previous date range" size="icon" variant="outline" onClick={() => controller.prev()}>
                <ChevronLeft />
              </Button>
              <Button variant="outline" onClick={() => controller.today()}>Today</Button>
              <Button aria-label="Next date range" size="icon" variant="outline" onClick={() => controller.next()}>
                <ChevronRight />
              </Button>
            </ButtonGroup>
            <Select value={controller.view?.type ?? views[0].key} onValueChange={(value) => controller.changeView(value)}>
              <SelectTrigger className="w-full sm:w-auto"><SelectValue /></SelectTrigger>
              <SelectContent align="end">
                <SelectGroup>
                  {views.map((view) => <SelectItem key={view.key} value={view.key}>{view.label}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button className="w-full sm:w-auto" disabled={!options.resorts.length} onClick={() => openCreate()}>
              <Plus />
              Add event
            </Button>
          </div>
        </div>

        <EventCalendarViews
          controller={controller}
          initialView={isMobile ? "listMonth" : views[0].key}
          plugins={[...plugins]}
          popoverCloseContent={() => <XIcon className="size-5 text-muted-foreground group-hover:text-foreground" />}
          events={calendarEvents}
          nowIndicator
          editable
          dateClick={(info) => openCreate(info.date)}
          eventClick={(info) => {
            const record = info.event.extendedProps.record as CalendarRecord;
            setSelectedRecord(record);
            setDetailsOpen(true);
          }}
          eventChange={async (info) => {
            const record = info.event.extendedProps.record as CalendarRecord;
            if (record.kind !== "sky_event" || !info.event.start) {
              info.revert();
              return;
            }
            try {
              const response = await fetch(`/api/sky-events/${record.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  startsAt: info.event.start.toISOString(),
                  endsAt: info.event.end?.toISOString() || null,
                }),
              });
              if (!response.ok) throw new Error(await responseError(response));
              toast.success("Sky event schedule updated");
              setRefreshKey((value) => value + 1);
            } catch (error) {
              info.revert();
              toast.error(error instanceof Error ? error.message : "Could not update the event schedule");
            }
          }}
          datesSet={(info) => {
            setDateInfo({
              title: info.view.title,
              days: differenceInCalendarDays(info.view.currentEnd, info.view.currentStart),
            });
            setRange({ start: info.start.toISOString(), end: info.end.toISOString() });
          }}
        />
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
          {selectedRecord ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <DialogTitle>{selectedRecord.title}</DialogTitle>
                  <StatusBadge value={selectedRecord.status} />
                </div>
                <DialogDescription>
                  {selectedRecord.kind === "booking" ? "Booking schedule details" : "Sky event details"}
                </DialogDescription>
              </DialogHeader>
              {selectedRecord.kind === "booking" ? (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Detail label="Booking code" value={selectedRecord.bookingCode} />
                  <Detail label="Guest" value={selectedRecord.guestName} />
                  <Detail label="Start" value={formatDateTime(selectedRecord.startsAt)} />
                  <Detail label="End" value={formatDateTime(selectedRecord.endsAt)} />
                  <Detail label="Package" value={selectedRecord.packageName} />
                  <Detail label="Partner resort" value={selectedRecord.resortName} />
                  <Detail label="Staff" value={selectedRecord.staffName} />
                  <Detail label="Guests" value={`${selectedRecord.adultCount} adults, ${selectedRecord.childCount} children`} />
                  <Detail label="Phone" value={selectedRecord.guestPhone} />
                  <Detail label="Email" value={selectedRecord.guestEmail} />
                  <Detail label="Invoice total" value={formatCurrency(selectedRecord.invoiceTotalUsd)} />
                  <Detail label="Notes" value={selectedRecord.notes} />
                </dl>
              ) : (
                <dl className="grid gap-4 sm:grid-cols-2">
                  <Detail label="Event type" value={humanize(selectedRecord.eventType)} />
                  <Detail label="Start" value={formatDateTime(selectedRecord.startsAt)} />
                  <Detail label="End" value={formatDateTime(selectedRecord.endsAt)} />
                  <Detail label="Partner resort" value={selectedRecord.resortName} />
                  <Detail label="Package" value={selectedRecord.packageName} />
                  <Detail label="Observation spot" value={selectedRecord.observationSpot} />
                  <Detail label="Capacity" value={selectedRecord.capacity} />
                  <Detail label="Price override" value={selectedRecord.priceOverrideUsd == null ? null : formatCurrency(selectedRecord.priceOverrideUsd)} />
                  <Detail label="Source" value={selectedRecord.sourceUrl ? (
                    <a className="inline-flex items-center gap-1 underline underline-offset-4" href={selectedRecord.sourceUrl} target="_blank" rel="noreferrer">
                      {selectedRecord.sourceName || "Open source"}<ExternalLink className="size-3" />
                    </a>
                  ) : selectedRecord.sourceName} />
                  <Detail label="Description" value={selectedRecord.description} />
                  <Detail label="Last updated" value={formatDateTime(selectedRecord.updatedAt)} />
                </dl>
              )}
              <DialogFooter>
                {selectedRecord.kind === "booking" ? (
                  <Button asChild>
                    <Link href="/dashboard/admin/bookings"><ExternalLink />Open bookings</Link>
                  </Button>
                ) : (
                  <>
                    <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 />Delete</Button>
                    <Button onClick={() => openEdit(selectedRecord)}><Pencil />Edit event</Button>
                  </>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) setEditingEvent(null);
      }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <form className="contents" onSubmit={saveEvent}>
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit sky event" : "Add sky event"}</DialogTitle>
              <DialogDescription>
                {editingEvent ? "Update the event details stored in PostgreSQL." : "Add an operational event to the shared resort calendar."}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="event-title">Title</FieldLabel>
                <Input id="event-title" required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-type">Event type</FieldLabel>
                <Select value={form.eventType} onValueChange={(value) => setForm({ ...form, eventType: value })}>
                  <SelectTrigger id="event-type" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {availableEventTypes.map((type) => (
                      <SelectItem key={type.slug} value={type.slug}>{type.name}</SelectItem>
                    ))}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="event-resort">Partner resort</FieldLabel>
                <Select value={form.resortId} onValueChange={(value) => setForm({ ...form, resortId: value, packageId: "none" })}>
                  <SelectTrigger id="event-resort" className="w-full"><SelectValue placeholder="Select resort" /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    {options.resorts.map((resort) => <SelectItem key={resort.id} value={resort.id}>{resort.name}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="event-start">Starts at</FieldLabel>
                <Input id="event-start" required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-end">Ends at</FieldLabel>
                <Input id="event-end" required type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-status">Status</FieldLabel>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as SkyEvent["status"] })}>
                  <SelectTrigger id="event-status" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sold_out">Sold out</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="event-package">Package</FieldLabel>
                <Select value={form.packageId} onValueChange={(value) => setForm({ ...form, packageId: value })}>
                  <SelectTrigger id="event-package" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>
                    <SelectItem value="none">No package</SelectItem>
                    {availablePackages.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}{item.is_active ? "" : " (inactive)"}</SelectItem>)}
                  </SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="event-spot">Observation spot</FieldLabel>
                <Input id="event-spot" maxLength={120} value={form.observationSpot} onChange={(event) => setForm({ ...form, observationSpot: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-capacity">Capacity</FieldLabel>
                <Input id="event-capacity" min={1} step={1} type="number" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-price">Price override (USD)</FieldLabel>
                <Input id="event-price" min={0} step="0.01" type="number" value={form.priceOverrideUsd} onChange={(event) => setForm({ ...form, priceOverrideUsd: event.target.value })} />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="event-description">Description</FieldLabel>
                <Textarea id="event-description" maxLength={1500} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                <FieldDescription>Operational notes visible to teams using this event.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="event-source-name">Source name</FieldLabel>
                <Input id="event-source-name" maxLength={120} value={form.sourceName} onChange={(event) => setForm({ ...form, sourceName: event.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="event-source-url">Source URL</FieldLabel>
                <Input id="event-source-url" type="url" maxLength={500} value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <PackageImageField
                  currentImageUrl={editingEvent?.imageUrl}
                  onChange={setEventImage}
                  description="JPG, PNG, or WEBP up to 2MB. Displayed on the public landing page."
                  savedDescription="Displayed on the public landing page"
                  previewAlt="Event preview"
                />
              </div>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={saving} onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Spinner /> : null}{editingEvent ? "Save changes" : "Create event"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sky event?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedRecord?.title || "This event"} will be removed from the shared calendar. Existing bookings remain available but will no longer reference this event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={deleting} onClick={(event) => {
              event.preventDefault();
              void deleteEvent();
            }}>
              {deleting ? <Spinner /> : <Trash2 />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
