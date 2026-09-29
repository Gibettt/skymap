import Link from "next/link";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  MoonStar,
  Sparkles,
  Star,
  Telescope,
  Users,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PerformanceOverview } from "../../default/_components/performance-overview";
import { SubscriberOverview } from "../../default/_components/subscriber-overview";
import type { StaffOverviewData } from "../_lib/overview-data";

type Props = {
  data: StaffOverviewData;
  permissions: string[];
  userName: string;
  resortName: string | null;
};

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Team";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { weekday: "--", day: "--", full: "Date unavailable" };
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Indian/Maldives" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit", timeZone: "Indian/Maldives" }).format(date),
    full: new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Indian/Maldives",
    }).format(date),
  };
}

function ChangeBadge({ value }: { value: number }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const isDown = safeValue < 0;
  const Icon = isDown ? ArrowDownRight : ArrowUpRight;

  return (
    <Badge
      className={
        isDown
          ? "border-rose-300/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/10"
          : "border-cyan-300/20 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10"
      }
    >
      <Icon className="size-3" />
      {safeValue > 0 ? "+" : ""}
      {numberFormatter.format(safeValue)}%
    </Badge>
  );
}

function SkyMetric({
  icon: Icon,
  iconClassName,
  label,
  value,
  note,
  change,
}: {
  icon: typeof Users;
  iconClassName: string;
  label: string;
  value: string;
  note: string;
  change?: number;
}) {
  return (
    <article className="rounded-2xl border border-cyan-300/20 bg-[#071d3d]/80 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_45px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 ${iconClassName}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {typeof change === "number" ? <ChangeBadge value={change} /> : null}
      </div>
      <p className="mt-3 text-slate-300 text-xs sm:text-sm">{label}</p>
      <p className="mt-1 truncate font-semibold text-2xl text-white tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 line-clamp-2 min-h-8 text-[11px] text-slate-400 leading-4 sm:text-xs">{note}</p>
    </article>
  );
}

const skyFeatures = [
  { icon: Sparkles, title: "Traditional seasons", copy: "Follow the natural rhythm of Maldivian island life." },
  { icon: MoonStar, title: "Moon calendar", copy: "Plan observations around lunar phases and tides." },
  { icon: Star, title: "Celestial events", copy: "Keep every guest experience aligned with the sky." },
] as const;
const scheduleIconStyles = [
  "bg-fuchsia-400/12 text-fuchsia-300",
  "bg-cyan-400/12 text-cyan-300",
  "bg-violet-400/12 text-violet-300",
] as const;

export function InternalStaffOverview({ data, permissions, userName, resortName }: Props) {
  const canViewFinance = permissions.includes("staff.finance");
  const canManageBookings = permissions.includes("staff.bookings");
  const visibleBookings = data.recentBookings.slice(0, 6);

  return (
    <div
      data-internal-overview
      className="relative isolate -m-2 min-h-[calc(100svh-3rem)] overflow-hidden rounded-2xl bg-[#03142f] text-white sm:-m-4 sm:rounded-3xl md:-m-6"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[44rem] bg-center bg-cover opacity-75"
        style={{ backgroundImage: "url('/external-dashboard-night.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,13,36,0.12)_0%,rgba(3,20,47,0.78)_37%,#03142f_72%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_7%,rgba(34,211,238,0.13),transparent_25%),radial-gradient(circle_at_75%_12%,rgba(217,70,239,0.13),transparent_24%)]" />

      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-3 sm:gap-6 sm:p-5 lg:p-7">
        <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(17rem,0.42fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col justify-between rounded-3xl border border-cyan-300/20 bg-[#061936]/76 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-7">
            <div>
              <div className="flex items-center gap-3 text-cyan-100 text-xs uppercase tracking-[0.28em]">
                <span>The Maldives sky calendar</span>
                <span className="h-0.5 min-w-10 flex-1 rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-300" />
              </div>
              <h1 className="mt-5 font-semibold text-4xl text-white tracking-[-0.045em] sm:text-5xl xl:text-6xl">
                Sky Calendar
              </h1>
              <p className="mt-4 max-w-md text-slate-200 text-sm leading-6 sm:text-base">
                Welcome, {firstName(userName)}. Coordinate bookings, guest schedules, and celestial experiences from one
                clear view.
              </p>
              {resortName ? <p className="mt-2 font-medium text-cyan-200 text-sm">{resortName}</p> : null}
            </div>

            <div className="mt-7 space-y-4">
              {skyFeatures.map((feature, index) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full border bg-[#0a244a]/85 ${
                      index === 1 ? "border-cyan-300/55 text-cyan-300" : "border-fuchsia-300/55 text-fuchsia-300"
                    }`}
                  >
                    <feature.icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-white">{feature.title}</p>
                    <p className="mt-0.5 text-slate-400 text-xs leading-5">{feature.copy}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">
              <Button
                asChild
                className="border border-fuchsia-300/25 bg-fuchsia-500/20 text-white hover:bg-fuchsia-500/30"
              >
                <Link href="/dashboard/internal/jadwal">
                  View calendar <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-cyan-300/20 bg-cyan-400/5 text-cyan-100 hover:bg-cyan-400/10 hover:text-white"
              >
                <Link href="/dashboard/internal/sky-events">
                  Explore sky guide <Telescope data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="min-w-0 rounded-3xl border border-cyan-300/30 bg-[#041833]/88 p-3 shadow-[0_28px_90px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-5">
            <div className="flex flex-col gap-3 border-cyan-300/15 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200 hover:bg-fuchsia-400/10">
                    <Sparkles className="size-3" /> Internal staff
                  </Badge>
                  <span className="text-slate-400 text-xs">Live operational overview</span>
                </div>
                <h2 className="mt-2 font-semibold text-2xl text-white tracking-tight">
                  Good to see you, {firstName(userName)}
                </h2>
              </div>
              {canManageBookings ? (
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-[0_10px_30px_rgba(168,85,247,0.24)] hover:from-fuchsia-400 hover:to-violet-500 sm:w-auto"
                >
                  <Link href="/dashboard/internal/bookings?new=1">
                    New booking <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <SkyMetric
                icon={CircleDollarSign}
                iconClassName="text-fuchsia-300"
                label="Earned commission"
                value={canViewFinance ? usdFormatter.format(data.metrics.earnedCommissionUsd) : "Restricted"}
                change={canViewFinance ? data.metrics.commissionChange : undefined}
                note={canViewFinance ? "Eligible completed bookings" : "Finance access is not enabled"}
              />
              <SkyMetric
                icon={CalendarDays}
                iconClassName="text-violet-300"
                label="New bookings"
                value={data.metrics.newBookings.toLocaleString("en-US")}
                change={data.metrics.bookingChange}
                note="Created in the last 30 days"
              />
              <SkyMetric
                icon={Users}
                iconClassName="text-cyan-300"
                label="Open bookings"
                value={data.metrics.openBookings.toLocaleString("en-US")}
                change={data.metrics.openBookingRate}
                note="Pending, active, or rescheduled"
              />
              <SkyMetric
                icon={Waves}
                iconClassName="text-emerald-300"
                label="Completion rate"
                value={`${numberFormatter.format(data.metrics.completionRate)}%`}
                note={`${data.metrics.completedBookings}/${data.metrics.totalBookings} experiences completed`}
              />
            </div>

            <div className="mt-4 rounded-2xl border border-cyan-300/18 bg-[#061b3a]/78 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">Latest booking schedule</h3>
                  <p className="mt-0.5 text-slate-400 text-xs">Recent experiences in your booking scope</p>
                </div>
                <Link href="/dashboard/internal/jadwal" className="shrink-0 text-cyan-300 text-xs hover:text-cyan-200">
                  View all
                </Link>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {visibleBookings.length ? (
                  visibleBookings.map((booking, index) => {
                    const date = formatDate(booking.joined);
                    return (
                      <div
                        key={booking.id}
                        className="grid min-w-0 grid-cols-[2.75rem_2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-cyan-300/12 bg-[#06152f]/75 px-2.5 py-2 transition-colors hover:border-fuchsia-300/25 hover:bg-[#0a2448]/80"
                      >
                        <span className="text-center">
                          <span className="block text-[10px] text-slate-400 uppercase">{date.weekday}</span>
                          <span className="block font-semibold text-cyan-100 text-sm">{date.day}</span>
                        </span>
                        <span
                          className={`grid size-8 place-items-center rounded-lg ${scheduleIconStyles[index % scheduleIconStyles.length]}`}
                        >
                          {index % 2 === 0 ? <Star className="size-4" /> : <MoonStar className="size-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-white text-xs">{booking.plan}</span>
                          <span className="block truncate text-[10px] text-slate-400">{date.full}</span>
                        </span>
                        <Badge className="max-w-20 truncate border-violet-300/15 bg-violet-400/10 px-1.5 text-[9px] text-violet-200 hover:bg-violet-400/10">
                          {booking.status}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-8 text-center text-slate-400 text-sm">No booking schedule yet.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section data-internal-dashboard-card className="min-w-0">
          <PerformanceOverview data={data.activity} reportHref="/dashboard/internal/bookings" />
        </section>

        <section data-internal-dashboard-card className="min-w-0">
          <SubscriberOverview
            data={data.recentBookings}
            total={data.metrics.totalBookings}
            exportFilename={`ephemeris-internal-recent-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`}
            newBookingHref={canManageBookings ? "/dashboard/internal/bookings?new=1" : undefined}
          />
        </section>
      </div>
    </div>
  );
}
