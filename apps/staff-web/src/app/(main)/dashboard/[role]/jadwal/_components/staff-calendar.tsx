"use client";

import * as React from "react";

import { CalendarClock, CalendarDays, ShieldAlert, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

import { loadAllStaffBookings, type StaffBooking, type StaffRole, shortTime, titleCase } from "../../_lib/staff-api";

const CALENDAR_METRIC_SKELETONS = ["month", "day", "upcoming"] as const;
const CALENDAR_AGENDA_SKELETONS = ["first", "second", "third", "fourth"] as const;

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function bookingDateKey(value: string) {
  return String(value).slice(0, 10);
}

function dateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function longDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function statusVariant(status: StaffBooking["status"]) {
  if (status === "active" || status === "rescheduled") return "default" as const;
  if (status === "completed") return "secondary" as const;
  if (status === "rejected" || status.startsWith("cancelled_")) return "destructive" as const;
  return "outline" as const;
}

function CalendarLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {CALENDAR_METRIC_SKELETONS.map((metric) => (
          <Card key={metric} size="sm" className="min-w-0">
            <CardHeader className="px-2.5 sm:px-3">
              <Skeleton className="h-3.5 w-full max-w-16 sm:h-4 sm:max-w-24" />
              <Skeleton className="h-6 w-10 sm:h-8 sm:w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <Card>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-3">
            {CALENDAR_AGENDA_SKELETONS.map((agenda) => (
              <Skeleton key={agenda} className="h-24 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AgendaBooking({ booking }: { booking: StaffBooking }) {
  const guestCount = Number(booking.adult_count) + Number(booking.child_count);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{booking.guest_name}</CardTitle>
        <CardDescription>
          {booking.booking_code} / {booking.package_name}
        </CardDescription>
        <CardAction>
          <Badge variant={statusVariant(booking.status)}>{titleCase(booking.status)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Time</span>
          <span className="font-medium">
            {shortTime(booking.time_start)} - {shortTime(booking.time_end)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Guests</span>
          <span className="font-medium">
            {guestCount} guest{guestCount === 1 ? "" : "s"} / Room {booking.room_number}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Observation spot</span>
          <span className="font-medium">{booking.observation_spot ?? "To be assigned"}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function StaffCalendar({ role, readOnly }: { role: StaffRole; readOnly: boolean }) {
  const [bookings, setBookings] = React.useState<StaffBooking[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => new Date());
  const [visibleMonth, setVisibleMonth] = React.useState<Date>(() => new Date());

  const loadBookings = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBookings(await loadAllStaffBookings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load booking calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const bookingsByDate = React.useMemo(() => {
    const grouped = new Map<string, StaffBooking[]>();
    for (const booking of bookings) {
      const key = bookingDateKey(booking.event_date);
      const dayBookings = grouped.get(key) || [];
      dayBookings.push(booking);
      grouped.set(key, dayBookings);
    }
    for (const dayBookings of grouped.values()) {
      dayBookings.sort((left, right) => String(left.time_start || "").localeCompare(String(right.time_start || "")));
    }
    return grouped;
  }, [bookings]);

  const bookedDates = React.useMemo(() => [...bookingsByDate.keys()].map(dateFromKey), [bookingsByDate]);
  const selectedBookings = bookingsByDate.get(dateKey(selectedDate)) || [];
  const monthBookings = bookings.filter((booking) => {
    const bookingDate = dateFromKey(bookingDateKey(booking.event_date));
    return (
      bookingDate.getFullYear() === visibleMonth.getFullYear() && bookingDate.getMonth() === visibleMonth.getMonth()
    );
  });
  const todayKey = dateKey(new Date());
  const upcomingBookings = bookings.filter(
    (booking) =>
      bookingDateKey(booking.event_date) >= todayKey &&
      !booking.status.startsWith("cancelled_") &&
      booking.status !== "rejected",
  );

  function selectToday() {
    const today = new Date();
    setSelectedDate(today);
    setVisibleMonth(today);
  }

  if (loading && !bookings.length) return <CalendarLoading />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">
              {role === "internal" ? "Resort Calendar" : "My Schedule"}
            </h1>
            <Badge variant="outline">{titleCase(role)} staff</Badge>
            {readOnly ? <Badge variant="secondary">Read only</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {role === "internal"
              ? "Review booking activity scheduled across your assigned resort."
              : "Review the dates and times for bookings created from your account."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={selectToday}>
            <CalendarDays data-icon="inline-start" />
            Today
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <ShieldAlert />
          <AlertTitle>Calendar could not be loaded</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card size="sm" className="min-w-0">
          <CardHeader className="gap-1 px-2.5 sm:px-3">
            <CardDescription className="text-[11px] leading-tight sm:text-sm">
              <span className="sm:hidden">Month</span>
              <span className="hidden sm:inline">{monthLabel(visibleMonth)}</span>
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">{monthBookings.length}</CardTitle>
            <CardAction className="hidden rounded-lg bg-muted p-2 text-muted-foreground sm:block">
              <CalendarDays className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent className="hidden text-muted-foreground text-xs sm:block">
            Bookings in the visible month
          </CardContent>
        </Card>
        <Card size="sm" className="min-w-0">
          <CardHeader className="gap-1 px-2.5 sm:px-3">
            <CardDescription className="text-[11px] leading-tight sm:text-sm">
              <span className="sm:hidden">Day</span>
              <span className="hidden sm:inline">Selected day</span>
            </CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">{selectedBookings.length}</CardTitle>
            <CardAction className="hidden rounded-lg bg-muted p-2 text-muted-foreground sm:block">
              <CalendarClock className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent className="hidden text-muted-foreground text-xs sm:block">{longDate(selectedDate)}</CardContent>
        </Card>
        <Card size="sm" className="min-w-0">
          <CardHeader className="gap-1 px-2.5 sm:px-3">
            <CardDescription className="text-[11px] leading-tight sm:text-sm">Upcoming</CardDescription>
            <CardTitle className="text-xl tabular-nums sm:text-2xl">{upcomingBookings.length}</CardTitle>
            <CardAction className="hidden rounded-lg bg-muted p-2 text-muted-foreground sm:block">
              <Users className="size-4" />
            </CardAction>
          </CardHeader>
          <CardContent className="hidden text-muted-foreground text-xs sm:block">
            Open and completed future bookings
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Month view</CardTitle>
            <CardDescription>Dates with bookings are marked below.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              month={visibleMonth}
              onMonthChange={setVisibleMonth}
              selected={selectedDate}
              onSelect={(date) => {
                if (!date) return;
                setSelectedDate(date);
                setVisibleMonth(date);
              }}
              modifiers={{ booked: bookedDates }}
              modifiersClassNames={{
                booked:
                  "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary data-[selected=true]:after:bg-primary-foreground",
              }}
              className="w-full [--cell-size:--spacing(9)] sm:[--cell-size:--spacing(11)]"
              classNames={{ root: "w-full" }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{longDate(selectedDate)}</CardTitle>
            <CardDescription>
              {selectedBookings.length} booking{selectedBookings.length === 1 ? "" : "s"} scheduled for this day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedBookings.length ? (
              <div className="flex flex-col gap-3">
                {selectedBookings.map((booking) => (
                  <AgendaBooking key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <Empty className="min-h-72">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarClock />
                  </EmptyMedia>
                  <EmptyTitle>No bookings scheduled</EmptyTitle>
                  <EmptyDescription>Select another marked date to review its booking agenda.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
