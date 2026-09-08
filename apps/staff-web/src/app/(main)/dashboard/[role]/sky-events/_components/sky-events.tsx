"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { format } from "date-fns";
import { CalendarDays, CloudDownload, Eye, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { SkyEventDialog } from "./sky-event-dialog";

export type SkyEvent = {
  id: string;
  title: string;
  eventType: "astronomy" | "meteor" | "resort";
  startsAt: string;
  endsAt: string | null;
  description: string;
  sourceName: string;
  sourceUrl: string | null;
  visibility: "north" | "south" | "both";
  resortId: string;
  packageId: string | null;
  packageName: string | null;
  observationSpot: string;
  capacity: number | null;
  priceOverrideUsd: number | null;
  imageUrl: string | null;
  status: "draft" | "published" | "cancelled" | "sold_out";
  isPublished: boolean;
};

export type SkyPackage = { id: string; name: string };

type SkyLocation = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  observationSpots: string;
} | null;

function titleCase(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function statusVariant(status: SkyEvent["status"]) {
  if (status === "published") return "default" as const;
  if (status === "cancelled" || status === "sold_out") return "destructive" as const;
  return "secondary" as const;
}

export function SkyEvents({ readOnly }: { readOnly: boolean }) {
  const [events, setEvents] = useState<SkyEvent[]>([]);
  const [packages, setPackages] = useState<SkyPackage[]>([]);
  const [location, setLocation] = useState<SkyLocation>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SkyEvent | null>(null);
  const [viewing, setViewing] = useState<SkyEvent | null>(null);
  const [deleting, setDeleting] = useState<SkyEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsResponse, packagesResponse, settingsResponse] = await Promise.all([
        fetch("/api/sky-events", { cache: "no-store" }),
        fetch("/api/packages", { cache: "no-store" }),
        fetch("/api/sky-settings", { cache: "no-store" }),
      ]);
      const [eventPayload, packagePayload, settingsPayload] = await Promise.all([
        eventsResponse.json(),
        packagesResponse.json(),
        settingsResponse.json(),
      ]);
      if (!eventsResponse.ok) throw new Error(eventPayload.error ?? "Unable to load sky events");
      setEvents(eventPayload.events ?? []);
      if (packagesResponse.ok) setPackages(packagePayload.packages ?? []);
      if (settingsResponse.ok) setLocation(settingsPayload.location ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load sky events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const spots = useMemo(
    () =>
      (location?.observationSpots ?? "")
        .split(",")
        .map((spot) => spot.trim())
        .filter(Boolean),
    [location],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (event: SkyEvent) => {
    setEditing(event);
    setFormOpen(true);
  };

  const save = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/sky-events/${editing.id}` : "/api/sky-events", {
        method: editing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save sky event");
      toast.success(editing ? "Sky event updated" : "Sky event created");
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Unable to save sky event");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/sky-events/${deleting.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to delete sky event");
      toast.success("Sky event deleted");
      setDeleting(null);
      await load();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Unable to delete sky event");
    } finally {
      setSaving(false);
    }
  };

  const syncOfficial = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/sky-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sync_official_calendar", year: new Date().getFullYear() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to sync official calendar");
      toast.success(`${result.insertedCount ?? 0} official events added`);
      await load();
    } catch (syncError) {
      toast.error(syncError instanceof Error ? syncError.message : "Unable to sync official calendar");
    } finally {
      setSyncing(false);
    }
  };

  let eventsContent: React.ReactNode;
  if (loading) {
    eventsContent = (
      <div className="space-y-3 px-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  } else if (error) {
    eventsContent = (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays />
          </EmptyMedia>
          <EmptyTitle>Sky events could not be loaded</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      </Empty>
    );
  } else if (events.length) {
    eventsContent = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Event</TableHead>
            <TableHead>Date and time</TableHead>
            <TableHead className="hidden md:table-cell">Location</TableHead>
            <TableHead className="hidden lg:table-cell">Package</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="pl-4">
                <div className="font-medium">{event.title}</div>
                <div className="text-muted-foreground text-xs">{titleCase(event.eventType)}</div>
              </TableCell>
              <TableCell>
                <div>{format(new Date(event.startsAt), "dd MMM yyyy")}</div>
                <div className="text-muted-foreground text-xs">
                  {format(new Date(event.startsAt), "HH:mm")}
                  {event.endsAt ? `–${format(new Date(event.endsAt), "HH:mm")}` : ""}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{event.observationSpot || "—"}</TableCell>
              <TableCell className="hidden lg:table-cell">{event.packageName ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(event.status)}>{titleCase(event.status)}</Badge>
              </TableCell>
              <TableCell className="pr-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal />
                      <span className="sr-only">Event actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setViewing(event)}>
                      <Eye /> View details
                    </DropdownMenuItem>
                    {!readOnly ? (
                      <DropdownMenuItem onSelect={() => openEdit(event)}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                    ) : null}
                    {!readOnly ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(event)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  } else {
    eventsContent = (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Sparkles />
          </EmptyMedia>
          <EmptyTitle>No upcoming sky events</EmptyTitle>
          <EmptyDescription>Create an event or synchronize the official astronomy calendar.</EmptyDescription>
        </EmptyHeader>
        {!readOnly ? (
          <Button onClick={openCreate}>
            <Plus /> Add event
          </Button>
        ) : null}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Sky Guide</h1>
          <p className="text-muted-foreground text-sm">
            Manage astronomy events and observing sessions for {location?.name ?? "your resort"}.
          </p>
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={syncing} onClick={() => void syncOfficial()}>
              <CloudDownload /> {syncing ? "Syncing…" : "Sync official calendar"}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus /> Add event
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Upcoming events</CardDescription>
            <CardTitle className="text-2xl">{events.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Published</CardDescription>
            <CardTitle className="text-2xl">{events.filter((event) => event.status === "published").length}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Observation spots</CardDescription>
            <CardTitle className="text-2xl">{spots.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event calendar</CardTitle>
          <CardDescription>Events scheduled during the next twelve months.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">{eventsContent}</CardContent>
      </Card>

      <SkyEventDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        event={editing}
        packages={packages}
        observationSpots={spots}
        saving={saving}
        onSave={save}
      />

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.title}</DialogTitle>
            <DialogDescription>
              {viewing ? `${titleCase(viewing.eventType)} · ${format(new Date(viewing.startsAt), "PPP 'at' p")}` : ""}
            </DialogDescription>
          </DialogHeader>
          {viewing ? (
            <div className="grid gap-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusVariant(viewing.status)}>{titleCase(viewing.status)}</Badge>
                <Badge variant="outline">{titleCase(viewing.visibility)}</Badge>
              </div>
              <p className="text-muted-foreground">{viewing.description || "No description provided."}</p>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">Observation spot</dt>
                <dd>{viewing.observationSpot || "—"}</dd>
                <dt className="text-muted-foreground">Package</dt>
                <dd>{viewing.packageName ?? "—"}</dd>
                <dt className="text-muted-foreground">Capacity</dt>
                <dd>{viewing.capacity ?? "Unlimited"}</dd>
                <dt className="text-muted-foreground">Price override</dt>
                <dd>{viewing.priceOverrideUsd == null ? "—" : `$${viewing.priceOverrideUsd.toFixed(2)}`}</dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd>
                  {viewing.sourceUrl ? (
                    <a
                      className="underline underline-offset-4"
                      href={viewing.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {viewing.sourceName || "Open source"}
                    </a>
                  ) : (
                    viewing.sourceName || "—"
                  )}
                </dd>
              </dl>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete sky event?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will be permanently removed from the resort calendar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={(event) => {
                event.preventDefault();
                void remove();
              }}
            >
              {saving ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
