"use client";

import * as React from "react";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnVisibilityState,
  type PaginationState,
  type ReactTable,
  type SortingState,
  Subscribe,
  useTable,
} from "@tanstack/react-table";
import {
  Ban,
  CalendarClock,
  CheckCircle2,
  CirclePlay,
  CloudRain,
  Download,
  Eye,
  Grid,
  MoreHorizontal,
  Pencil,
  Plus,
  Rows3,
  Search,
  ShieldCheck,
  Signature,
  SlidersHorizontal,
  Trash2,
  UserX,
  Workflow,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuCheckboxItem,
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { type DataTableFeatures, dataTableFeatures } from "@/lib/data-table-features";
import { getInitials } from "@/lib/utils";

import {
  formatDate,
  formatUsd,
  loadAllStaffBookings,
  type StaffBooking,
  type StaffPackage,
  type StaffRole,
  type StaffUser,
  shortTime,
  staffApi,
  titleCase,
} from "../../_lib/staff-api";
import { NewBookingForm } from "../../form-booking/_components/new-booking-form";

interface MeResponse {
  user: StaffUser;
}

interface PackagesResponse {
  packages: StaffPackage[];
}

type BookingStatus = StaffBooking["status"];

interface StatusAction {
  booking: StaffBooking;
  status: BookingStatus;
  title: string;
  description: string;
}

const BOOKING_ROW_SKELETONS = ["one", "two", "three", "four", "five", "six"];
const COLUMN_LABELS: Record<string, string> = {
  guest: "Booking",
  eventDate: "Schedule",
  package_name: "Package",
  staff_name: "Staff",
  resort: "Resort",
  guests: "Guests",
  status: "Status",
  commission: "Commission",
};

function uniqueOptions(values: Array<string | null>) {
  return ["All", ...Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort()];
}

function csvCell(value: string | number) {
  const normalized = String(value);
  const spreadsheetSafeValue = /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  return `"${spreadsheetSafeValue.replaceAll('"', '""')}"`;
}

function normalizeBooking(booking: StaffBooking): StaffBooking {
  return {
    ...booking,
    adult_count: Number(booking.adult_count),
    child_count: Number(booking.child_count),
    booked_adult_price_usd: Number(booking.booked_adult_price_usd ?? 0),
    booked_child_price_usd: Number(booking.booked_child_price_usd ?? 0),
    invoice_total_usd: Number(booking.invoice_total_usd ?? 0),
    staff_commission_5_usd: Number(booking.staff_commission_5_usd ?? 0),
    signed_by_guest: Boolean(booking.signed_by_guest),
    participants: Array.isArray(booking.participants)
      ? booking.participants
          .map((participant) => ({
            ...participant,
            age: participant.age == null ? null : Number(participant.age),
          }))
          .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
      : [],
    experiences: Array.isArray(booking.experiences)
      ? booking.experiences
          .map((experience) => ({
            ...experience,
            adultPriceUsd: Number(experience.adultPriceUsd ?? 0),
            childPriceUsd: Number(experience.childPriceUsd ?? 0),
            baseTotalUsd: Number(experience.baseTotalUsd ?? 0),
          }))
          .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
      : [],
  };
}

function bookingStatusVariant(status: BookingStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "rejected" || status.startsWith("cancelled_")) return "destructive";
  if (status === "pending") return "outline";
  if (status === "rescheduled") return "secondary";
  return "default";
}

function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge className="gap-1.5 border px-2 py-1 font-medium" variant={bookingStatusVariant(status)}>
      <span className="size-1.5 rounded-full bg-current" />
      {titleCase(status)}
    </Badge>
  );
}

function BookingLoading() {
  return (
    <Card>
      <CardHeader className="border-b">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
        <CardAction className="flex gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-20" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        <div className="flex gap-3">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-7 w-32" />
        </div>
        {BOOKING_ROW_SKELETONS.map((item) => (
          <Skeleton key={item} className="h-16 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function BookingDetails({
  booking,
  open,
  onOpenChange,
  showInternalDetails,
}: {
  booking: StaffBooking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showInternalDetails: boolean;
}) {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{booking.guest_name}</DialogTitle>
          <DialogDescription>
            {booking.booking_code} · {booking.package_name}
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className="grid gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel>Status</FieldLabel>
            <div>
              <BookingStatusBadge status={booking.status} />
            </div>
          </Field>
          <Field>
            <FieldLabel>Schedule</FieldLabel>
            <Input
              readOnly
              value={`${formatDate(booking.event_date)}, ${shortTime(booking.time_start)}–${shortTime(booking.time_end)}`}
            />
          </Field>
          <Field>
            <FieldLabel>Guest phone</FieldLabel>
            <Input readOnly value={booking.guest_phone ?? "-"} />
          </Field>
          <Field>
            <FieldLabel>Guest email</FieldLabel>
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
            <FieldLabel>Guests</FieldLabel>
            <Input readOnly value={`${booking.adult_count} adults, ${booking.child_count} children`} />
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel>Experience schedule</FieldLabel>
            {booking.experiences?.length ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Experience</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Spot</TableHead>
                      <TableHead className="text-right">Base</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booking.experiences.map((experience, index) => (
                      <TableRow key={experience.id ?? `${booking.id}-experience-${index}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{experience.packageName}</span>
                            {index === 0 ? <Badge variant="secondary">Primary</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(experience.eventDate)}</TableCell>
                        <TableCell>
                          {shortTime(experience.timeStart)}–{shortTime(experience.timeEnd)}
                        </TableCell>
                        <TableCell>{experience.observationSpot || experience.location || "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatUsd(experience.baseTotalUsd)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Input
                readOnly
                value={`${booking.package_name} · ${formatDate(booking.event_date)}, ${shortTime(booking.time_start)}–${shortTime(booking.time_end)}`}
              />
            )}
          </Field>
          <Field className="md:col-span-2">
            <FieldLabel>Participants</FieldLabel>
            {booking.participants?.length ? (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Nationality</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {booking.participants.map((participant, index) => (
                      <TableRow key={participant.id ?? `${booking.id}-${index}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{participant.fullName}</span>
                            {index === 0 ? <Badge variant="secondary">Primary</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>{titleCase(participant.type)}</TableCell>
                        <TableCell>{participant.age ?? "-"}</TableCell>
                        <TableCell>{participant.nationality}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Input readOnly value="Participant details are unavailable for this legacy booking." />
            )}
          </Field>
          <Field>
            <FieldLabel>Invoice total</FieldLabel>
            <Input readOnly value={formatUsd(booking.invoice_total_usd)} />
          </Field>
          <Field>
            <FieldLabel>Staff</FieldLabel>
            <Input readOnly value={`${booking.staff_name} (${titleCase(booking.staff_role)})`} />
          </Field>
          <Field>
            <FieldLabel>Resort</FieldLabel>
            <Input readOnly value={booking.resort_name ?? "-"} />
          </Field>
          <Field>
            <FieldLabel>Guest signature</FieldLabel>
            <Input readOnly value={booking.signed_by_guest ? "Signed" : "Not signed"} />
          </Field>
          <Field>
            <FieldLabel>Commission</FieldLabel>
            <Input readOnly value={formatUsd(booking.staff_commission_5_usd)} />
          </Field>
          {showInternalDetails ? (
            <Field className="md:col-span-2">
              <FieldLabel>Operational notes</FieldLabel>
              <Textarea readOnly value={booking.notes ?? "No notes"} />
            </Field>
          ) : null}
        </FieldGroup>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

interface BookingActionsProps {
  booking: StaffBooking;
  canManage: boolean;
  pending: boolean;
  onView: (booking: StaffBooking) => void;
  onEdit: (booking: StaffBooking) => void;
  onDelete: (booking: StaffBooking) => void;
  onStatus: (action: StatusAction) => void;
  onReschedule: (booking: StaffBooking) => void;
  onSigned: (booking: StaffBooking) => void;
}

function BookingActions({
  booking,
  canManage,
  pending,
  onView,
  onEdit,
  onDelete,
  onStatus,
  onReschedule,
  onSigned,
}: BookingActionsProps) {
  const operational = booking.status === "active" || booking.status === "rescheduled";
  const canSign = operational || booking.status === "completed";
  const hasBookingActions = booking.status === "pending" || operational || canSign;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="size-8 rounded-md text-muted-foreground hover:bg-muted/50"
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${booking.booking_code}`}
          disabled={pending}
        >
          {pending ? <Spinner /> : <MoreHorizontal />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>{booking.booking_code}</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onView(booking)}>
            <Eye />
            View
          </DropdownMenuItem>
          {canManage ? (
            <DropdownMenuItem onSelect={() => onEdit(booking)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        {canManage ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Workflow />
                  Booking actions
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-56" sideOffset={8}>
                  <DropdownMenuGroup>
                    {booking.status === "pending" ? (
                      <DropdownMenuItem
                        onSelect={() =>
                          onStatus({
                            booking,
                            status: "active",
                            title: "Approve booking?",
                            description:
                              "This booking will become active and be assigned to the internal operations team.",
                          })
                        }
                      >
                        <CirclePlay />
                        Activate booking
                      </DropdownMenuItem>
                    ) : null}
                    {booking.status === "pending" ? (
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() =>
                          onStatus({
                            booking,
                            status: "rejected",
                            title: "Reject booking?",
                            description: "The request will be closed as rejected and can no longer be operated.",
                          })
                        }
                      >
                        <XCircle />
                        Reject booking
                      </DropdownMenuItem>
                    ) : null}
                    {operational ? (
                      <DropdownMenuItem
                        onSelect={() =>
                          onStatus({
                            booking,
                            status: "completed",
                            title: "Complete booking?",
                            description: "Mark this experience as completed after the field operation is finished.",
                          })
                        }
                      >
                        <CheckCircle2 />
                        Mark completed
                      </DropdownMenuItem>
                    ) : null}
                    {operational ? (
                      <DropdownMenuItem onSelect={() => onReschedule(booking)}>
                        <CalendarClock />
                        Reschedule
                      </DropdownMenuItem>
                    ) : null}
                    {canSign ? (
                      <DropdownMenuItem onSelect={() => onSigned(booking)}>
                        <Signature />
                        {booking.signed_by_guest ? "Mark as unsigned" : "Mark as signed"}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuGroup>
                  {operational ? <DropdownMenuSeparator /> : null}
                  {operational ? (
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
                              onSelect={() =>
                                onStatus({
                                  booking,
                                  status: "cancelled_by_guest",
                                  title: "Cancel by guest?",
                                  description: "The booking will be closed with the guest cancellation reason.",
                                })
                              }
                            >
                              <UserX />
                              Cancel by guest
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="whitespace-nowrap"
                              onSelect={() =>
                                onStatus({
                                  booking,
                                  status: "cancelled_weather",
                                  title: "Cancel due to weather?",
                                  description: "The booking will be closed because observing conditions are unsafe.",
                                })
                              }
                            >
                              <CloudRain />
                              Cancel due to weather
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </DropdownMenuGroup>
                  ) : null}
                  {!hasBookingActions ? (
                    <DropdownMenuGroup>
                      <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
                    </DropdownMenuGroup>
                  ) : null}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(booking)}>
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BookingActionContext {
  canManage: boolean;
  pendingId: string | null;
  onView: (booking: StaffBooking) => void;
  onEdit: (booking: StaffBooking) => void;
  onDelete: (booking: StaffBooking) => void;
  onStatus: (action: StatusAction) => void;
  onReschedule: (booking: StaffBooking) => void;
  onSigned: (booking: StaffBooking) => void;
}

function createStaffBookingsColumns(actions: BookingActionContext): ColumnDef<DataTableFeatures, StaffBooking>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Subscribe
            source={table.atoms.rowSelection}
            selector={() =>
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected() && "indeterminate")
            }
          >
            {(checked) => (
              <Checkbox
                aria-label="Select all bookings"
                checked={checked}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              />
            )}
          </Subscribe>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Subscribe source={row.table.atoms.rowSelection} selector={(selection) => Boolean(selection?.[row.id])}>
            {(checked) => (
              <Checkbox
                aria-label={`Select ${row.original.booking_code}`}
                checked={checked}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
              />
            )}
          </Subscribe>
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "search",
      accessorFn: (row) =>
        `${row.booking_code} ${row.guest_name} ${row.guest_phone ?? ""} ${row.room_number} ${row.package_name} ${row.staff_name} ${row.resort_name ?? ""}`,
      filterFn: "includesString",
      enableHiding: false,
      enableSorting: false,
    },
    {
      id: "guest",
      accessorFn: (row) => row.guest_name,
      header: "Booking",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="font-medium">
            <AvatarFallback>{getInitials(row.original.guest_name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground text-sm">{row.original.guest_name}</div>
            <div className="truncate font-mono text-muted-foreground text-xs">{row.original.booking_code}</div>
          </div>
        </div>
      ),
    },
    {
      id: "eventDate",
      accessorFn: (row) => new Date(row.event_date).getTime(),
      header: "Schedule",
      cell: ({ row }) => (
        <div className="grid gap-0.5 whitespace-nowrap">
          <span>{formatDate(row.original.event_date)}</span>
          <span className="text-muted-foreground text-xs">
            {shortTime(row.original.time_start)} - {shortTime(row.original.time_end)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "package_name",
      header: "Package",
      filterFn: "equalsString",
      cell: ({ row }) => <div className="max-w-48 truncate">{row.original.package_name}</div>,
    },
    {
      accessorKey: "staff_name",
      header: "Staff",
      filterFn: "equalsString",
      cell: ({ row }) => <div className="max-w-40 truncate">{row.original.staff_name}</div>,
    },
    {
      id: "resort",
      accessorFn: (row) => row.resort_name ?? "Unassigned",
      header: "Resort",
      filterFn: "equalsString",
      cell: ({ row }) => <div className="max-w-40 truncate">{row.original.resort_name ?? "Unassigned"}</div>,
    },
    {
      id: "guests",
      accessorFn: (row) => Number(row.adult_count) + Number(row.child_count),
      header: "Guests",
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-sm tabular-nums">
          {Number(row.original.adult_count) + Number(row.original.child_count)} guests
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      filterFn: "equalsString",
      cell: ({ row }) => <BookingStatusBadge status={row.original.status} />,
    },
    {
      id: "commission",
      accessorFn: (row) => Number(row.staff_commission_5_usd ?? 0),
      header: () => <div className="text-right">Commission</div>,
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-right font-medium tabular-nums">
          {formatUsd(row.original.staff_commission_5_usd)}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <BookingActions
            booking={row.original}
            canManage={actions.canManage}
            pending={actions.pendingId === row.original.id}
            onView={actions.onView}
            onEdit={actions.onEdit}
            onDelete={actions.onDelete}
            onStatus={actions.onStatus}
            onReschedule={actions.onReschedule}
            onSigned={actions.onSigned}
          />
        </div>
      ),
      enableHiding: false,
      enableSorting: false,
    },
  ];
}

function preventPaginationNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

function getPageNumbers(currentPage: number, pageCount: number) {
  if (pageCount <= 3) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (currentPage <= 2) return [1, 2, 3];
  if (currentPage >= pageCount - 1) return [pageCount - 2, pageCount - 1, pageCount];
  return [currentPage - 1, currentPage, currentPage + 1];
}

function StaffBookingsTable({ table }: { table: ReactTable<DataTableFeatures, StaffBooking> }) {
  return (
    <div className="overflow-x-auto">
      <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
        <TableHeader className="[&_tr]:border-t">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="py-4 font-normal">
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-border/60 hover:bg-muted/20"
                data-state={table.state.rowSelection[row.id] && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3 py-4 align-middle">
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                No bookings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function StaffBookingsGrid({
  table,
  actions,
}: {
  table: ReactTable<DataTableFeatures, StaffBooking>;
  actions: BookingActionContext;
}) {
  const rows = table.getRowModel().rows;

  if (!rows.length) {
    return (
      <Empty className="min-h-72 border-y">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarClock />
          </EmptyMedia>
          <EmptyTitle>No bookings found</EmptyTitle>
          <EmptyDescription>Adjust the search or filters to find another booking.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 border-y bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(({ original: booking }) => (
        <Card key={booking.id} size="sm" className="gap-4 bg-card">
          <CardHeader className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
            <Avatar size="lg" className="font-medium">
              <AvatarFallback>{getInitials(booking.guest_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{booking.guest_name}</CardTitle>
              <CardDescription className="truncate font-mono text-xs">{booking.booking_code}</CardDescription>
            </div>
            <BookingActions
              booking={booking}
              canManage={actions.canManage}
              pending={actions.pendingId === booking.id}
              onView={actions.onView}
              onEdit={actions.onEdit}
              onDelete={actions.onDelete}
              onStatus={actions.onStatus}
              onReschedule={actions.onReschedule}
              onSigned={actions.onSigned}
            />
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="col-span-2 flex items-center justify-between gap-3">
              <BookingStatusBadge status={booking.status} />
              <span className="font-medium tabular-nums">{formatUsd(booking.staff_commission_5_usd)}</span>
            </div>
            <div className="min-w-0">
              <div className="text-muted-foreground text-xs">Package</div>
              <div className="truncate font-medium">{booking.package_name}</div>
            </div>
            <div className="min-w-0">
              <div className="text-muted-foreground text-xs">Schedule</div>
              <div className="truncate font-medium">{formatDate(booking.event_date)}</div>
            </div>
            <div className="min-w-0">
              <div className="text-muted-foreground text-xs">Resort</div>
              <div className="truncate font-medium">{booking.resort_name ?? "Unassigned"}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Guests</div>
              <div className="font-medium tabular-nums">{booking.adult_count + booking.child_count} guests</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BookingsPagination({ table }: { table: ReactTable<DataTableFeatures, StaffBooking> }) {
  const pageCount = Math.max(table.getPageCount(), 1);
  const currentPage = Math.min(table.state.pagination.pageIndex + 1, pageCount);
  const pageNumbers = getPageNumbers(currentPage, pageCount);
  const rowsPerPage = `${table.state.pagination.pageSize}`;

  return (
    <>
      <Separator />
      <div className="flex flex-col gap-3 px-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select value={rowsPerPage} onValueChange={(value) => table.setPageSize(Number(value))}>
              <SelectTrigger size="sm" className="w-20" id="staff-bookings-rows-per-page">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <span>
            Page {currentPage} of {pageCount}
          </span>
        </div>

        <Pagination className="mx-0 w-auto justify-start md:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text=""
                className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  preventPaginationNavigation(event);
                  table.previousPage();
                }}
              />
            </PaginationItem>
            {pageNumbers[0] > 1 ? (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            ) : null}
            {pageNumbers.map((pageNumber) => (
              <PaginationItem key={`page-${pageNumber}`}>
                <PaginationLink
                  href="#"
                  isActive={table.state.pagination.pageIndex === pageNumber - 1}
                  onClick={(event) => {
                    preventPaginationNavigation(event);
                    table.setPageIndex(pageNumber - 1);
                  }}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}
            {pageNumbers[pageNumbers.length - 1] < pageCount ? (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            ) : null}
            <PaginationItem>
              <PaginationNext
                href="#"
                text=""
                className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  preventPaginationNavigation(event);
                  table.nextPage();
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </>
  );
}

export function StaffBookings({ role, initialNewBooking = false }: { role: StaffRole; initialNewBooking?: boolean }) {
  const [user, setUser] = React.useState<StaffUser | null>(null);
  const [bookings, setBookings] = React.useState<StaffBooking[]>([]);
  const [packages, setPackages] = React.useState<StaffPackage[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [rowSelection, setRowSelection] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "eventDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>({ search: false });
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [newBookingOpen, setNewBookingOpen] = React.useState(initialNewBooking);
  const [viewBooking, setViewBooking] = React.useState<StaffBooking | null>(null);
  const [editBooking, setEditBooking] = React.useState<StaffBooking | null>(null);
  const [editPackageId, setEditPackageId] = React.useState("");
  const [deleteBooking, setDeleteBooking] = React.useState<StaffBooking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = React.useState<StaffBooking | null>(null);
  const [statusAction, setStatusAction] = React.useState<StatusAction | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [me, allBookings, packageData] = await Promise.all([
        staffApi<MeResponse>("/api/me", { cache: "no-store" }),
        loadAllStaffBookings(),
        staffApi<PackagesResponse>("/api/packages", { cache: "no-store" }),
      ]);

      setUser(me.user);
      setPackages(packageData.packages ?? []);
      setBookings(
        allBookings
          .map(normalizeBooking)
          .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at))),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const closeNewBooking = React.useCallback(() => {
    setNewBookingOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has("new")) {
      url.searchParams.delete("new");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const readOnly = user?.access_role_level === "read_only";
  const canManage = role === "internal" && user?.role === "internal" && !readOnly;
  const openEditDialog = React.useCallback((booking: StaffBooking) => {
    setEditPackageId(booking.package_id ?? "");
    setEditBooking(booking);
  }, []);

  const updateBooking = React.useCallback(
    async (booking: StaffBooking, payload: Record<string, unknown>, message: string) => {
      setPendingId(booking.id);
      try {
        await staffApi<{ booking: StaffBooking }>(`/api/bookings/${booking.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success(message);
        await loadData();
        return true;
      } catch (updateError) {
        toast.error(updateError instanceof Error ? updateError.message : "Unable to update booking.");
        return false;
      } finally {
        setPendingId(null);
      }
    },
    [loadData],
  );

  async function confirmStatusUpdate() {
    if (!statusAction) return;
    const action = statusAction;
    setStatusAction(null);
    await updateBooking(
      action.booking,
      { status: action.status },
      `${action.booking.booking_code} is now ${titleCase(action.status)}.`,
    );
  }

  const toggleSigned = React.useCallback(
    async (booking: StaffBooking) => {
      await updateBooking(
        booking,
        { signedByGuest: !booking.signed_by_guest },
        booking.signed_by_guest ? "Guest signature removed." : "Guest signature recorded.",
      );
    },
    [updateBooking],
  );

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editBooking) return;

    const booking = editBooking;
    const formData = new FormData(event.currentTarget);
    const hasStoredParticipants = Boolean(booking.participants?.length);
    const adultCount = hasStoredParticipants ? booking.adult_count : Number(formData.get("adultCount"));
    const childCount = hasStoredParticipants ? booking.child_count : Number(formData.get("childCount"));
    if (!hasStoredParticipants && adultCount + childCount <= 0) {
      toast.error("At least one guest is required.");
      return;
    }

    const payload: Record<string, unknown> = {
      guestPhone: formData.get("guestPhone"),
      guestEmail: String(formData.get("guestEmail") ?? "").trim() || null,
      preferredLanguage: String(formData.get("preferredLanguage") ?? "").trim() || null,
      roomNumber: formData.get("roomNumber"),
      bookingSource: String(formData.get("bookingSource") ?? "").trim() || null,
      paymentMethod: String(formData.get("paymentMethod") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    };
    if (!hasStoredParticipants) {
      payload.guestName = formData.get("guestName");
      payload.nationality = formData.get("nationality");
      payload.adultCount = adultCount;
      payload.childCount = childCount;
    }
    if (editPackageId && editPackageId !== booking.package_id) payload.packageId = editPackageId;
    if (["active", "rescheduled", "completed"].includes(booking.status)) {
      payload.signedByGuest = formData.get("signedByGuest") === "yes";
    }

    const updated = await updateBooking(booking, payload, `${booking.booking_code} was updated.`);
    if (updated) setEditBooking(null);
  }

  async function confirmDeleteBooking() {
    if (!deleteBooking) return;
    const booking = deleteBooking;
    setPendingId(booking.id);
    try {
      await staffApi<{ booking: { id: string; bookingCode: string } }>(`/api/bookings/${booking.id}`, {
        method: "DELETE",
      });
      setDeleteBooking(null);
      toast.success(`${booking.booking_code} was deleted.`);
      await loadData();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Unable to delete booking.");
    } finally {
      setPendingId(null);
    }
  }

  async function submitReschedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rescheduleBooking) return;
    const booking = rescheduleBooking;
    const formData = new FormData(event.currentTarget);
    const eventDate = String(formData.get("eventDate") || "");
    const timeStart = String(formData.get("timeStart") || "");
    const timeEnd = String(formData.get("timeEnd") || "");
    const reason = String(formData.get("reason") || "");

    if (timeEnd <= timeStart) {
      toast.error("End time must be after start time.");
      return;
    }

    setPendingId(booking.id);
    try {
      await staffApi<{ booking: StaffBooking }>(`/api/bookings/${booking.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventDate, timeStart, timeEnd, reason }),
      });
      setRescheduleBooking(null);
      toast.success(`${booking.booking_code} was rescheduled.`);
      await loadData();
    } catch (rescheduleError) {
      toast.error(rescheduleError instanceof Error ? rescheduleError.message : "Unable to reschedule booking.");
    } finally {
      setPendingId(null);
    }
  }

  const actionContext = React.useMemo<BookingActionContext>(
    () => ({
      canManage,
      pendingId,
      onView: setViewBooking,
      onEdit: openEditDialog,
      onDelete: setDeleteBooking,
      onStatus: setStatusAction,
      onReschedule: setRescheduleBooking,
      onSigned: (booking) => void toggleSigned(booking),
    }),
    [canManage, openEditDialog, pendingId, toggleSigned],
  );
  const columns = React.useMemo(() => createStaffBookingsColumns(actionContext), [actionContext]);
  const table = useTable({
    features: dataTableFeatures,
    data: bookings,
    columns,
    state: { rowSelection, sorting, columnFilters, columnVisibility, pagination },
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  React.useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const filterOptions = React.useMemo(
    () => ({
      statuses: uniqueOptions(bookings.map((booking) => booking.status)),
      packages: uniqueOptions(bookings.map((booking) => booking.package_name)),
      staff: uniqueOptions(bookings.map((booking) => booking.staff_name)),
      resorts: uniqueOptions(bookings.map((booking) => booking.resort_name ?? "Unassigned")),
    }),
    [bookings],
  );

  const searchQuery = (table.getColumn("search")?.getFilterValue() as string | undefined) ?? "";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string | undefined) ?? "All";
  const packageFilter = (table.getColumn("package_name")?.getFilterValue() as string | undefined) ?? "All";
  const staffFilter = (table.getColumn("staff_name")?.getFilterValue() as string | undefined) ?? "All";
  const resortFilter = (table.getColumn("resort")?.getFilterValue() as string | undefined) ?? "All";
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide());

  function setColumnSelectFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === "All" ? undefined : value);
    table.setPageIndex(0);
  }

  function exportBookings() {
    const header = [
      "Booking code",
      "Guest",
      "Event date",
      "Time",
      "Package",
      "Staff",
      "Resort",
      "Status",
      "Guests",
      "Invoice (USD)",
      "Commission (USD)",
    ];
    const rows = table
      .getFilteredRowModel()
      .rows.map(({ original }) => [
        original.booking_code,
        original.guest_name,
        original.event_date,
        `${original.time_start ?? "-"} - ${original.time_end ?? "-"}`,
        original.package_name,
        original.staff_name,
        original.resort_name ?? "Unassigned",
        titleCase(original.status),
        Number(original.adult_count) + Number(original.child_count),
        Number(original.invoice_total_usd ?? 0),
        Number(original.staff_commission_5_usd ?? 0),
      ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ephemeris-${role}-bookings.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const isDestructiveStatusAction = Boolean(
    statusAction && (statusAction.status.startsWith("cancelled_") || statusAction.status === "rejected"),
  );

  if (loading) return <BookingLoading />;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {error ? (
        <Alert variant="destructive">
          <ShieldCheck />
          <AlertTitle>Bookings could not be loaded</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 md:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Bookings</CardTitle>
          <CardDescription className="max-w-sm leading-snug">
            {role === "internal"
              ? "Manage booking schedules and statuses assigned to your resort."
              : "Track bookings submitted from your external staff account."}
            {readOnly ? " Your assigned access is view only." : null}
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto flex w-full flex-wrap justify-start gap-2 justify-self-stretch md:col-start-2 md:row-span-2 md:row-start-1 md:w-auto md:flex-nowrap md:justify-end md:justify-self-end">
            <InputGroup className="h-7 w-full md:w-64">
              <InputGroupAddon align="inline-start">
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchInputRef}
                className="h-7"
                aria-label="Search bookings"
                placeholder="Search bookings..."
                value={searchQuery}
                onChange={(event) => {
                  table.getColumn("search")?.setFilterValue(event.target.value || undefined);
                  table.setPageIndex(0);
                }}
              />
              <InputGroupAddon align="inline-end">
                <Kbd className="h-4 text-[10px]">Ctrl K</Kbd>
              </InputGroupAddon>
            </InputGroup>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal data-icon="inline-start" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {hideableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {COLUMN_LABELS[column.id] ?? titleCase(column.id)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" onClick={exportBookings} disabled={!bookings.length}>
              <Download data-icon="inline-start" />
              Export
            </Button>

            {!readOnly ? (
              <Button size="sm" onClick={() => setNewBookingOpen(true)}>
                <Plus data-icon="inline-start" />
                New booking
              </Button>
            ) : null}
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={(value) => setColumnSelectFilter("status", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Status:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {filterOptions.statuses.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option === "All" ? option : titleCase(option)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={packageFilter} onValueChange={(value) => setColumnSelectFilter("package_name", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Package:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {filterOptions.packages.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select value={staffFilter} onValueChange={(value) => setColumnSelectFilter("staff_name", value)}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Staff:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    {filterOptions.staff.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <Select value={resortFilter} onValueChange={(value) => setColumnSelectFilter("resort", value)}>
              <SelectTrigger size="sm">
                <span className="text-muted-foreground">Resort:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end">
                <SelectGroup>
                  {filterOptions.resorts.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 px-4">
            <div className="text-muted-foreground text-sm tabular-nums">
              {selectedCount} selected / {table.getFilteredRowModel().rows.length} bookings
            </div>

            <Tabs
              value={viewMode}
              onValueChange={(value) => {
                if (value === "list" || value === "grid") setViewMode(value);
              }}
            >
              <TabsList>
                <TabsTrigger value="list" aria-label="List view">
                  <Rows3 />
                </TabsTrigger>
                <TabsTrigger value="grid" aria-label="Grid view">
                  <Grid />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-1 flex-col gap-4">
            {viewMode === "list" ? (
              <StaffBookingsTable table={table} />
            ) : (
              <StaffBookingsGrid table={table} actions={actionContext} />
            )}
            <BookingsPagination table={table} />
          </div>
        </CardContent>
      </Card>

      <Sheet
        open={newBookingOpen}
        onOpenChange={(open) => {
          if (open) setNewBookingOpen(true);
          else closeNewBooking();
        }}
      >
        <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-6xl">
          <SheetHeader className="border-b pr-12">
            <SheetTitle>New booking</SheetTitle>
            <SheetDescription>
              Create a booking for guests at your assigned resort without leaving the Bookings menu.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <NewBookingForm
              role={role}
              onCancel={closeNewBooking}
              onCreated={async () => {
                closeNewBooking();
                await loadData();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <BookingDetails
        booking={viewBooking}
        open={Boolean(viewBooking)}
        onOpenChange={(open) => !open && setViewBooking(null)}
        showInternalDetails={role === "internal"}
      />

      <Dialog open={Boolean(editBooking)} onOpenChange={(open) => !open && setEditBooking(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <form className="flex flex-col gap-4" onSubmit={submitEdit}>
            <DialogHeader>
              <DialogTitle>Edit booking</DialogTitle>
              <DialogDescription>
                Update guest details, package, and billing inputs for {editBooking?.booking_code}.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="edit-booking-guest-name">Primary guest name</FieldLabel>
                <Input
                  id="edit-booking-guest-name"
                  name="guestName"
                  defaultValue={editBooking?.guest_name}
                  readOnly={Boolean(editBooking?.participants?.length)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-phone">Phone</FieldLabel>
                <Input
                  id="edit-booking-phone"
                  name="guestPhone"
                  defaultValue={editBooking?.guest_phone ?? ""}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-email">Email</FieldLabel>
                <Input
                  id="edit-booking-email"
                  name="guestEmail"
                  type="email"
                  defaultValue={editBooking?.guest_email ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-room">Room number</FieldLabel>
                <Input id="edit-booking-room" name="roomNumber" defaultValue={editBooking?.room_number} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-nationality">Nationality</FieldLabel>
                <Input
                  id="edit-booking-nationality"
                  name="nationality"
                  defaultValue={editBooking?.nationality}
                  readOnly={Boolean(editBooking?.participants?.length)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-language">Preferred language</FieldLabel>
                <Input
                  id="edit-booking-language"
                  name="preferredLanguage"
                  defaultValue={editBooking?.preferred_language ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-resort">Resort</FieldLabel>
                <Input id="edit-booking-resort" readOnly value={editBooking?.resort_name ?? "Unassigned"} />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-staff">Staff</FieldLabel>
                <Input id="edit-booking-staff" readOnly value={editBooking?.staff_name ?? "Unassigned"} />
              </Field>
              <Field data-disabled={Boolean(editBooking?.experiences?.length)}>
                <FieldLabel htmlFor="edit-booking-package">
                  Package{editBooking?.experiences?.length ? " (from experience schedule)" : ""}
                </FieldLabel>
                <Select
                  value={editPackageId}
                  disabled={Boolean(editBooking?.experiences?.length)}
                  onValueChange={(value) => value && setEditPackageId(value)}
                >
                  <SelectTrigger id="edit-booking-package" className="w-full">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {packages.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-adults">
                  Adults{editBooking?.participants?.length ? " (from participants)" : ""}
                </FieldLabel>
                <Input
                  id="edit-booking-adults"
                  name="adultCount"
                  type="number"
                  min="0"
                  defaultValue={editBooking?.adult_count}
                  readOnly={Boolean(editBooking?.participants?.length)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-children">
                  Children{editBooking?.participants?.length ? " (from participants)" : ""}
                </FieldLabel>
                <Input
                  id="edit-booking-children"
                  name="childCount"
                  type="number"
                  min="0"
                  defaultValue={editBooking?.child_count}
                  readOnly={Boolean(editBooking?.participants?.length)}
                  required
                />
              </Field>
              {editBooking && ["active", "rescheduled", "completed"].includes(editBooking.status) ? (
                <Field>
                  <FieldLabel htmlFor="edit-booking-signature">Guest signature</FieldLabel>
                  <Select name="signedByGuest" defaultValue={editBooking.signed_by_guest ? "yes" : "no"}>
                    <SelectTrigger id="edit-booking-signature" className="w-full">
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
              ) : null}
              <Field>
                <FieldLabel htmlFor="edit-booking-source">Booking source</FieldLabel>
                <Input id="edit-booking-source" name="bookingSource" defaultValue={editBooking?.booking_source ?? ""} />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-booking-payment">Payment method</FieldLabel>
                <Input
                  id="edit-booking-payment"
                  name="paymentMethod"
                  defaultValue={editBooking?.payment_method ?? ""}
                />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="edit-booking-notes">Notes</FieldLabel>
                <Textarea id="edit-booking-notes" name="notes" defaultValue={editBooking?.notes ?? ""} />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={pendingId === editBooking?.id}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pendingId === editBooking?.id || !editPackageId}>
                {pendingId === editBooking?.id ? <Spinner data-icon="inline-start" /> : null}
                {pendingId === editBooking?.id ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rescheduleBooking)} onOpenChange={(open) => !open && setRescheduleBooking(null)}>
        <DialogContent>
          <form className="flex flex-col gap-4" onSubmit={submitReschedule}>
            <DialogHeader>
              <DialogTitle>Reschedule {rescheduleBooking?.booking_code}</DialogTitle>
              <DialogDescription>The previous schedule will remain available in booking history.</DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="reschedule-date">Event date</FieldLabel>
                <DatePicker
                  id="reschedule-date"
                  name="eventDate"
                  defaultValue={rescheduleBooking?.event_date.slice(0, 10)}
                  required
                />
              </Field>
              <FieldGroup className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="reschedule-start">Start time</FieldLabel>
                  <TimePicker
                    id="reschedule-start"
                    name="timeStart"
                    defaultValue={shortTime(rescheduleBooking?.time_start)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="reschedule-end">End time</FieldLabel>
                  <TimePicker
                    id="reschedule-end"
                    name="timeEnd"
                    defaultValue={shortTime(rescheduleBooking?.time_end)}
                    required
                  />
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor="reschedule-reason">Reason</FieldLabel>
                <Textarea id="reschedule-reason" name="reason" maxLength={500} required />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={Boolean(pendingId)}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={Boolean(pendingId)}>
                {pendingId ? <Spinner data-icon="inline-start" /> : null}
                {pendingId ? "Saving..." : "Save schedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteBooking)} onOpenChange={(open) => !open && setDeleteBooking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteBooking?.booking_code}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the booking, its feedback, and reschedule history. Financial totals will also be
              recalculated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingId === deleteBooking?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pendingId === deleteBooking?.id}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteBooking();
              }}
            >
              {pendingId === deleteBooking?.id ? <Spinner data-icon="inline-start" /> : null}
              {pendingId === deleteBooking?.id ? "Deleting..." : "Delete booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(statusAction)} onOpenChange={(open) => !open && setStatusAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{statusAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{statusAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={isDestructiveStatusAction ? "destructive" : "default"}
              onClick={(event) => {
                event.preventDefault();
                void confirmStatusUpdate();
              }}
            >
              Confirm action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
