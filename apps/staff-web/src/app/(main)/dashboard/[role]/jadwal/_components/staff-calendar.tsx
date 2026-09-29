"use client";

import * as React from "react";

import { CalendarClock, CalendarDays, MoonStar, ShieldAlert, Sparkles, Star, Users } from "lucide-react";

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
    <div data-staff-feature-page="calendar" className="flex min-w-0 flex-col gap-6">
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

  if (role === "internal") {
    const packageActivity = Array.from(
      bookings.reduce((packages, booking) => {
        const packageName = booking.package_name || "Unassigned experience";
        packages.set(packageName, (packages.get(packageName) ?? 0) + 1);
        return packages;
      }, new Map<string, number>()),
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
    const featureRows = [
      {
        icon: CalendarDays,
        title: "Scheduled experiences",
        copy: `${monthBookings.length} bookings in ${monthLabel(visibleMonth)}.`,
        tone: "border-fuchsia-300/60 text-fuchsia-300",
      },
      {
        icon: Star,
        title: "Upcoming activities",
        copy: `${upcomingBookings.length} future bookings currently in your scope.`,
        tone: "border-cyan-300/60 text-cyan-300",
      },
      {
        icon: MoonStar,
        title: "Resort sky calendar",
        copy: `${bookedDates.length} dates contain scheduled guest experiences.`,
        tone: "border-fuchsia-300/60 text-fuchsia-300",
      },
    ] as const;

    return (
      <div
        data-internal-calendar
        className="relative isolate -m-2 min-h-[calc(100svh-3rem)] overflow-hidden rounded-2xl bg-[#03142f] text-white sm:-m-4 sm:rounded-3xl md:-m-6"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[46rem] bg-center bg-cover opacity-70"
          style={{ backgroundImage: "url('/external-dashboard-night.png')" }}
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(3,17,42,0.2)_0%,rgba(3,20,47,0.82)_38%,#03142f_74%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_7%,rgba(217,70,239,0.12),transparent_24%),radial-gradient(circle_at_78%_14%,rgba(34,211,238,0.13),transparent_27%)]" />

        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-3 sm:gap-6 sm:p-5 lg:p-7">
          <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(17rem,0.4fr)_minmax(0,1fr)]">
            <aside className="flex min-w-0 flex-col justify-between rounded-3xl border border-cyan-300/20 bg-[#061936]/78 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-7">
              <div>
                <div className="flex items-center gap-3 text-cyan-100 text-xs uppercase tracking-[0.3em]">
                  <span>Introducing</span>
                  <span className="h-0.5 min-w-12 flex-1 rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300" />
                </div>
                <h1 className="mt-5 font-semibold text-4xl text-white tracking-[-0.045em] sm:text-5xl xl:text-[3.4rem] xl:leading-[0.94]">
                  Star Portal Calendar &amp; Activities
                </h1>
                <p className="mt-5 max-w-md text-slate-200 text-sm leading-6 sm:text-base">
                  Stay informed, plan ahead, and coordinate every resort experience in one place.
                </p>
              </div>

              <div className="mt-8 space-y-5">
                {featureRows.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3.5">
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-full border bg-[#0a244a]/85 ${feature.tone}`}
                    >
                      <feature.icon className="size-5" />
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-white sm:text-base">{feature.title}</p>
                      <p className="mt-1 text-slate-400 text-xs leading-5">{feature.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="min-w-0 rounded-3xl border border-cyan-300/30 bg-[#041833]/90 p-3 shadow-[0_28px_90px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-5">
              <div className="flex flex-col gap-3 border-cyan-300/15 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-fuchsia-400/12 text-fuchsia-300 ring-1 ring-fuchsia-300/25">
                      <CalendarDays className="size-5" />
                    </span>
                    <h2 className="font-semibold text-2xl text-white tracking-tight">Calendar</h2>
                    <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                      Internal staff
                    </Badge>
                    {readOnly ? (
                      <Badge className="border-violet-300/20 bg-violet-400/10 text-violet-200 hover:bg-violet-400/10">
                        Read only
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-slate-400 text-xs">Booking activities and resort experience schedule</p>
                </div>
                <Button
                  variant="outline"
                  onClick={selectToday}
                  className="w-full border-cyan-300/20 bg-cyan-400/5 text-cyan-100 hover:bg-cyan-400/10 hover:text-white sm:w-auto"
                >
                  <CalendarDays data-icon="inline-start" />
                  Today
                </Button>
              </div>

              {error ? (
                <Alert variant="destructive" className="mt-4 border-rose-300/25 bg-rose-500/10 text-rose-100">
                  <ShieldAlert />
                  <AlertTitle>Calendar could not be loaded</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="border-fuchsia-300/25 bg-gradient-to-r from-fuchsia-500/80 to-violet-600/75 px-3 py-1.5 text-white hover:from-fuchsia-500/80 hover:to-violet-600/75">
                  Activities &amp; Events
                </Badge>
                <Badge className="border-cyan-300/20 bg-cyan-400/8 px-3 py-1.5 text-cyan-100 hover:bg-cyan-400/8">
                  {monthLabel(visibleMonth)}
                </Badge>
                <Badge className="border-violet-300/20 bg-violet-400/8 px-3 py-1.5 text-violet-100 hover:bg-violet-400/8">
                  {selectedBookings.length} selected
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-fuchsia-300/16 bg-fuchsia-400/7 p-2.5 sm:p-3">
                  <p className="truncate text-[10px] text-slate-400 uppercase tracking-wide sm:text-xs">Month</p>
                  <p className="mt-1 font-semibold text-white text-xl tabular-nums sm:text-2xl">
                    {monthBookings.length}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-300/16 bg-cyan-400/7 p-2.5 sm:p-3">
                  <p className="truncate text-[10px] text-slate-400 uppercase tracking-wide sm:text-xs">Selected day</p>
                  <p className="mt-1 font-semibold text-white text-xl tabular-nums sm:text-2xl">
                    {selectedBookings.length}
                  </p>
                </div>
                <div className="rounded-xl border border-violet-300/16 bg-violet-400/7 p-2.5 sm:p-3">
                  <p className="truncate text-[10px] text-slate-400 uppercase tracking-wide sm:text-xs">Upcoming</p>
                  <p className="mt-1 font-semibold text-white text-xl tabular-nums sm:text-2xl">
                    {upcomingBookings.length}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.2fr)]">
                <article className="min-w-0 rounded-2xl border border-cyan-300/18 bg-[#061b3a]/80 p-3 sm:p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-white">Month view</h3>
                    <p className="mt-0.5 text-slate-400 text-xs">Dates with bookings are marked below.</p>
                  </div>
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
                        "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-cyan-300 data-[selected=true]:after:bg-white",
                    }}
                    className="w-full text-slate-200 [--cell-size:--spacing(8)] sm:[--cell-size:--spacing(9)] 2xl:[--cell-size:--spacing(10)]"
                    classNames={{ root: "w-full" }}
                  />
                </article>

                <article className="min-w-0 rounded-2xl border border-fuchsia-300/18 bg-[#061b3a]/80 p-3 sm:p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">{longDate(selectedDate)}</h3>
                      <p className="mt-0.5 text-slate-400 text-xs">
                        {selectedBookings.length} booking{selectedBookings.length === 1 ? "" : "s"} scheduled
                      </p>
                    </div>
                    <CalendarClock className="size-5 shrink-0 text-fuchsia-300" />
                  </div>
                  {selectedBookings.length ? (
                    <div className="flex max-h-[25rem] flex-col gap-2 overflow-y-auto pr-1">
                      {selectedBookings.map((booking) => (
                        <AgendaBooking key={booking.id} booking={booking} />
                      ))}
                    </div>
                  ) : (
                    <Empty className="min-h-64 border border-cyan-300/14 border-dashed bg-[#04152f]/45">
                      <EmptyHeader>
                        <EmptyMedia variant="icon" className="bg-cyan-400/10 text-cyan-300">
                          <CalendarClock />
                        </EmptyMedia>
                        <EmptyTitle className="text-white">No bookings scheduled</EmptyTitle>
                        <EmptyDescription className="text-slate-400">
                          Select another marked date to review its booking agenda.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </article>
              </div>
            </section>
          </section>

          {packageActivity.length ? (
            <section className="grid grid-cols-2 overflow-hidden rounded-3xl border border-cyan-300/18 bg-[#061936]/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-xl md:grid-cols-3 xl:grid-cols-6">
              {packageActivity.map(([packageName, count], index) => (
                <article
                  key={packageName}
                  className="min-w-0 border-cyan-300/12 border-b p-4 last:border-b-0 even:border-l md:border-b-0 md:border-l md:first:border-l-0"
                >
                  <span
                    className={`grid size-10 place-items-center rounded-full border ${
                      index % 2 === 0
                        ? "border-fuchsia-300/55 bg-fuchsia-400/8 text-fuchsia-300"
                        : "border-cyan-300/55 bg-cyan-400/8 text-cyan-300"
                    }`}
                  >
                    {index % 2 === 0 ? <Star className="size-5" /> : <Sparkles className="size-5" />}
                  </span>
                  <h3 className="mt-3 line-clamp-2 font-semibold text-sm text-white">{packageName}</h3>
                  <p className="mt-1 text-slate-400 text-xs">
                    {count} scheduled booking{count === 1 ? "" : "s"}
                  </p>
                </article>
              ))}
            </section>
          ) : null}

          <section className="flex flex-col gap-3 rounded-2xl border border-cyan-300/35 bg-[linear-gradient(100deg,rgba(192,38,211,0.14),rgba(3,20,47,0.76),rgba(34,211,238,0.13))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fuchsia-400/12 text-fuchsia-300 ring-1 ring-fuchsia-300/25">
                <CalendarClock className="size-5" />
              </span>
              <div>
                <p className="font-semibold text-white">Your schedule, simplified.</p>
                <p className="mt-0.5 text-slate-400 text-xs sm:text-sm">
                  Review every guest activity and booking schedule from one calendar.
                </p>
              </div>
            </div>
            <p className="text-cyan-200 text-xs">{longDate(selectedDate)}</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">My Schedule</h1>
            <Badge variant="outline">{titleCase(role)} staff</Badge>
            {readOnly ? <Badge variant="secondary">Read only</Badge> : null}
          </div>
          <p className="text-muted-foreground text-sm">
            Review the dates and times for bookings created from your account.
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
