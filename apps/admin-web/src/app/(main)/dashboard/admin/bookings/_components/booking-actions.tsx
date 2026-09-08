"use client";

import { type FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Ban,
  CalendarClock,
  CheckCircle2,
  CirclePlay,
  CloudRain,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserX,
  Workflow,
} from "lucide-react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import type { BookingOptions, BookingRow } from "../../_lib/admin-data";
import { formatUsd, titleCase } from "../../_lib/format";

interface BookingActionsProps {
  booking: BookingRow;
  options: BookingOptions;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

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

function shortTime(value: string | null) {
  return value ? value.slice(0, 5) : "-";
}

function inputTime(value: string | null) {
  return value ? value.slice(0, 5) : "";
}

export function BookingActions({ booking, options }: BookingActionsProps) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [reschedulePending, setReschedulePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [packageId, setPackageId] = useState(booking.package_id);
  const [staffId, setStaffId] = useState(booking.staff_id);
  const [resortId, setResortId] = useState(booking.resort_id ?? "");
  const [signedByGuest, setSignedByGuest] = useState(booking.signed_by_guest ? "yes" : "no");

  const canActivate = booking.status === "pending";
  const canComplete = ["active", "rescheduled"].includes(booking.status);
  const canReschedule = ["pending", "active", "rescheduled"].includes(booking.status);
  const canCancel = canReschedule;
  const busy = statusPending || editPending || reschedulePending || deletePending;

  function openEditDialog() {
    setPackageId(booking.package_id);
    setStaffId(booking.staff_id);
    setResortId(booking.resort_id ?? "");
    setSignedByGuest(booking.signed_by_guest ? "yes" : "no");
    setEditOpen(true);
  }

  function changeResort(nextResortId: string) {
    setResortId(nextResortId);

    const currentPackage = options.packages.find((item) => item.id === packageId);
    if (currentPackage?.resort_id && currentPackage.resort_id !== nextResortId) {
      setPackageId(
        options.packages.find((item) => item.is_active && (!item.resort_id || item.resort_id === nextResortId))?.id ??
          "",
      );
    }

    const currentStaff = options.staff.find((item) => item.id === staffId);
    if (
      currentStaff &&
      ["internal", "external"].includes(currentStaff.role) &&
      currentStaff.resort_id !== nextResortId
    ) {
      setStaffId(
        options.staff.find(
          (item) =>
            item.status === "active" &&
            (item.role === "admin" || !["internal", "external"].includes(item.role) || item.resort_id === nextResortId),
        )?.id ?? "",
      );
    }
  }

  async function updateStatus(nextStatus: string) {
    setStatusPending(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Booking status could not be updated.");

      toast.success(`${booking.booking_code} is now ${titleCase(nextStatus).toLowerCase()}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking status could not be updated.");
    } finally {
      setStatusPending(false);
    }
  }

  async function updateBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setEditPending(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: form.get("guestName"),
          guestPhone: form.get("guestPhone"),
          guestEmail: String(form.get("guestEmail") ?? "").trim() || null,
          preferredLanguage: String(form.get("preferredLanguage") ?? "").trim() || null,
          roomNumber: form.get("roomNumber"),
          nationality: form.get("nationality"),
          adultCount: form.get("adultCount"),
          childCount: form.get("childCount"),
          packageId,
          staffId,
          resortId,
          signedByGuest: signedByGuest === "yes",
          bookingSource: String(form.get("bookingSource") ?? "").trim() || null,
          paymentMethod: String(form.get("paymentMethod") ?? "").trim() || null,
          notes: String(form.get("notes") ?? "").trim() || null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Booking could not be updated.");

      toast.success(`${booking.booking_code} was updated.`);
      setEditOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking could not be updated.");
    } finally {
      setEditPending(false);
    }
  }

  async function rescheduleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setReschedulePending(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventDate: form.get("eventDate"),
          timeStart: form.get("timeStart"),
          timeEnd: form.get("timeEnd"),
          reason: form.get("reason"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Booking could not be rescheduled.");

      toast.success(`${booking.booking_code} was rescheduled.`);
      setRescheduleOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking could not be rescheduled.");
    } finally {
      setReschedulePending(false);
    }
  }

  async function deleteBooking() {
    setDeletePending(true);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Booking could not be deleted.");

      toast.success(`${booking.booking_code} was deleted.`);
      setDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking could not be deleted.");
    } finally {
      setDeletePending(false);
    }
  }

  const fieldId = (name: string) => `${name}-${booking.id}`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
            size="icon-sm"
            variant="ghost"
            disabled={busy}
            aria-label={`Actions for ${booking.booking_code}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuLabel>{booking.booking_code}</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => setViewOpen(true)}>
              <Eye />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={openEditDialog}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Workflow />
                Booking actions
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-56" sideOffset={8}>
                <DropdownMenuGroup>
                  {canActivate ? (
                    <DropdownMenuItem className="whitespace-nowrap" onSelect={() => void updateStatus("active")}>
                      <CirclePlay />
                      Activate booking
                    </DropdownMenuItem>
                  ) : null}
                  {canComplete ? (
                    <DropdownMenuItem className="whitespace-nowrap" onSelect={() => void updateStatus("completed")}>
                      <CheckCircle2 />
                      Mark as completed
                    </DropdownMenuItem>
                  ) : null}
                  {canReschedule ? (
                    <DropdownMenuItem className="whitespace-nowrap" onSelect={() => setRescheduleOpen(true)}>
                      <CalendarClock />
                      Reschedule
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuGroup>
                {canCancel ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Ban />
                          Cancel booking
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="min-w-56" sideOffset={8}>
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onSelect={() => void updateStatus("cancelled_by_guest")}
                            >
                              <UserX />
                              Cancel by guest
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onSelect={() => void updateStatus("cancelled_weather")}
                            >
                              <CloudRain />
                              Cancel due to weather
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>
                  </>
                ) : null}
                {!canActivate && !canComplete && !canReschedule && !canCancel ? (
                  <DropdownMenuGroup>
                    <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                  </DropdownMenuGroup>
                ) : null}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
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
            <DialogTitle>{booking.guest_name}</DialogTitle>
            <DialogDescription>{booking.booking_code} - Booking details from PostgreSQL.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Status</FieldLabel>
              <div>
                <Badge variant={booking.status.startsWith("cancelled") ? "destructive" : "secondary"}>
                  {titleCase(booking.status)}
                </Badge>
              </div>
            </Field>
            <Field>
              <FieldLabel>Schedule</FieldLabel>
              <Input
                readOnly
                value={`${formatDate(booking.event_date)}, ${shortTime(booking.time_start)}-${shortTime(booking.time_end)}`}
              />
            </Field>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <Input readOnly value={booking.guest_phone ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input readOnly value={booking.guest_email ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Room</FieldLabel>
              <Input readOnly value={booking.room_number} />
            </Field>
            <Field>
              <FieldLabel>Nationality</FieldLabel>
              <Input readOnly value={booking.nationality} />
            </Field>
            <Field>
              <FieldLabel>Preferred language</FieldLabel>
              <Input readOnly value={booking.preferred_language ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Booking source</FieldLabel>
              <Input readOnly value={booking.booking_source ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Package</FieldLabel>
              <Input readOnly value={booking.package_name} />
            </Field>
            <Field>
              <FieldLabel>Staff</FieldLabel>
              <Input readOnly value={booking.staff_name} />
            </Field>
            <Field>
              <FieldLabel>Resort</FieldLabel>
              <Input readOnly value={booking.resort_name ?? "Unassigned"} />
            </Field>
            <Field>
              <FieldLabel>Guests</FieldLabel>
              <Input readOnly value={`${booking.adult_count} adults, ${booking.child_count} children`} />
            </Field>
            <Field>
              <FieldLabel>Adult price</FieldLabel>
              <Input readOnly value={formatUsd(booking.booked_adult_price_usd)} />
            </Field>
            <Field>
              <FieldLabel>Child price</FieldLabel>
              <Input readOnly value={formatUsd(booking.booked_child_price_usd)} />
            </Field>
            <Field>
              <FieldLabel>Invoice total</FieldLabel>
              <Input readOnly value={formatUsd(booking.invoice_total_usd)} />
            </Field>
            <Field>
              <FieldLabel>Payment method</FieldLabel>
              <Input readOnly value={booking.payment_method ?? "-"} />
            </Field>
            <Field>
              <FieldLabel>Guest signature</FieldLabel>
              <Input readOnly value={booking.signed_by_guest ? "Signed" : "Not signed"} />
            </Field>
            <Field>
              <FieldLabel>Booking date</FieldLabel>
              <Input readOnly value={formatDate(booking.booking_date)} />
            </Field>
            <Field>
              <FieldLabel>Created</FieldLabel>
              <Input readOnly value={formatDateTime(booking.created_at)} />
            </Field>
            <Field>
              <FieldLabel>Last updated</FieldLabel>
              <Input readOnly value={formatDateTime(booking.updated_at)} />
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel>Experience schedule</FieldLabel>
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Experience</TableHead>
                      <TableHead>Date and time</TableHead>
                      <TableHead>Observation spot</TableHead>
                      <TableHead className="text-right">Base total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(booking.experiences.length > 0
                      ? booking.experiences
                      : [
                          {
                            id: booking.id,
                            packageId: booking.package_id,
                            packageName: booking.package_name,
                            location: null,
                            skyEventId: null,
                            eventDate: booking.event_date,
                            timeStart: booking.time_start,
                            timeEnd: booking.time_end,
                            observationSpot: null,
                            adultPriceUsd: booking.booked_adult_price_usd,
                            childPriceUsd: booking.booked_child_price_usd,
                            baseTotalUsd: 0,
                            sortOrder: 0,
                          },
                        ]
                    ).map((experience, index) => (
                      <TableRow key={experience.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{experience.packageName}</span>
                            {index === 0 ? <Badge variant="secondary">Primary</Badge> : null}
                          </div>
                          {experience.location ? (
                            <p className="text-muted-foreground text-xs">{experience.location}</p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div>{formatDate(experience.eventDate)}</div>
                          <div className="text-muted-foreground text-xs">
                            {shortTime(experience.timeStart)}-{shortTime(experience.timeEnd)}
                          </div>
                        </TableCell>
                        <TableCell>{experience.observationSpot ?? "-"}</TableCell>
                        <TableCell className="text-right">{formatUsd(experience.baseTotalUsd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Field>
            <Field className="md:col-span-2">
              <FieldLabel>Notes</FieldLabel>
              <Textarea readOnly value={booking.notes ?? "No notes"} />
            </Field>
          </FieldGroup>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form className="flex flex-col gap-4" onSubmit={updateBooking}>
            <DialogHeader>
              <DialogTitle>Edit booking</DialogTitle>
              <DialogDescription>Update guest details, assignment, package, and billing inputs.</DialogDescription>
            </DialogHeader>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={fieldId("booking-guest-name")}>Guest name</FieldLabel>
                <Input id={fieldId("booking-guest-name")} name="guestName" defaultValue={booking.guest_name} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-phone")}>Phone</FieldLabel>
                <Input
                  id={fieldId("booking-phone")}
                  name="guestPhone"
                  defaultValue={booking.guest_phone ?? ""}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-email")}>Email</FieldLabel>
                <Input
                  id={fieldId("booking-email")}
                  name="guestEmail"
                  type="email"
                  defaultValue={booking.guest_email ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-room")}>Room number</FieldLabel>
                <Input id={fieldId("booking-room")} name="roomNumber" defaultValue={booking.room_number} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-nationality")}>Nationality</FieldLabel>
                <Input
                  id={fieldId("booking-nationality")}
                  name="nationality"
                  defaultValue={booking.nationality}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-language")}>Preferred language</FieldLabel>
                <Input
                  id={fieldId("booking-language")}
                  name="preferredLanguage"
                  defaultValue={booking.preferred_language ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-resort")}>Resort</FieldLabel>
                <Select value={resortId} onValueChange={(value) => value && changeResort(value)}>
                  <SelectTrigger id={fieldId("booking-resort")} className="w-full">
                    <SelectValue placeholder="Select resort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {options.resorts.map((resort) => (
                        <SelectItem key={resort.id} value={resort.id} disabled={resort.status !== "active"}>
                          {`${resort.name}${resort.status !== "active" ? " (Inactive)" : ""}`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-package")}>Package</FieldLabel>
                <Select
                  disabled={booking.experiences.length > 0}
                  value={packageId}
                  onValueChange={(value) => value && setPackageId(value)}
                >
                  <SelectTrigger id={fieldId("booking-package")} className="w-full">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {options.packages.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                          disabled={!item.is_active || Boolean(item.resort_id && item.resort_id !== resortId)}
                        >
                          {`${item.name}${!item.is_active ? " (Inactive)" : ""}`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {booking.experiences.length > 0 ? (
                  <p className="text-muted-foreground text-xs">Managed by the primary experience schedule.</p>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-staff")}>Staff</FieldLabel>
                <Select value={staffId} onValueChange={(value) => value && setStaffId(value)}>
                  <SelectTrigger id={fieldId("booking-staff")} className="w-full">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {options.staff.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.id}
                          disabled={
                            item.status !== "active" ||
                            (["internal", "external"].includes(item.role) && item.resort_id !== resortId)
                          }
                        >
                          {`${item.name} - ${titleCase(item.role)}${item.status !== "active" ? " (Inactive)" : ""}`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-adults")}>Adults</FieldLabel>
                <Input
                  id={fieldId("booking-adults")}
                  name="adultCount"
                  type="number"
                  min="0"
                  defaultValue={Number(booking.adult_count)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-children")}>Children</FieldLabel>
                <Input
                  id={fieldId("booking-children")}
                  name="childCount"
                  type="number"
                  min="0"
                  defaultValue={Number(booking.child_count)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-signature")}>Guest signature</FieldLabel>
                <Select value={signedByGuest} onValueChange={(value) => value && setSignedByGuest(value)}>
                  <SelectTrigger id={fieldId("booking-signature")} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="no">Not signed</SelectItem>
                      <SelectItem value="yes">Signed</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-source")}>Booking source</FieldLabel>
                <Input
                  id={fieldId("booking-source")}
                  name="bookingSource"
                  defaultValue={booking.booking_source ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={fieldId("booking-payment")}>Payment method</FieldLabel>
                <Input
                  id={fieldId("booking-payment")}
                  name="paymentMethod"
                  defaultValue={booking.payment_method ?? ""}
                />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={fieldId("booking-notes")}>Notes</FieldLabel>
                <Textarea id={fieldId("booking-notes")} name="notes" defaultValue={booking.notes ?? ""} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={editPending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={editPending || !packageId || !staffId || !resortId}>
                {editPending && <Spinner data-icon="inline-start" />}
                {editPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <form className="flex flex-col gap-4" onSubmit={rescheduleBooking}>
            <DialogHeader>
              <DialogTitle>Reschedule booking</DialogTitle>
              <DialogDescription>
                Choose a new date and time. The previous schedule remains in history.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={fieldId("reschedule-date")}>Event date</FieldLabel>
                <Input
                  id={fieldId("reschedule-date")}
                  name="eventDate"
                  type="date"
                  defaultValue={booking.event_date.slice(0, 10)}
                  required
                />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor={fieldId("reschedule-start")}>Start time</FieldLabel>
                  <Input
                    id={fieldId("reschedule-start")}
                    name="timeStart"
                    type="time"
                    defaultValue={inputTime(booking.time_start)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={fieldId("reschedule-end")}>End time</FieldLabel>
                  <Input
                    id={fieldId("reschedule-end")}
                    name="timeEnd"
                    type="time"
                    defaultValue={inputTime(booking.time_end)}
                    required
                  />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor={fieldId("reschedule-reason")}>Reason</FieldLabel>
                <Textarea id={fieldId("reschedule-reason")} name="reason" required />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={reschedulePending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={reschedulePending}>
                {reschedulePending && <Spinner data-icon="inline-start" />}
                {reschedulePending ? "Rescheduling..." : "Save schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {booking.booking_code}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the booking and its feedback and reschedule history. Financial totals will also
              be recalculated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void deleteBooking();
              }}
            >
              {deletePending && <Spinner data-icon="inline-start" />}
              {deletePending ? "Deleting..." : "Delete booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
