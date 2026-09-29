import Link from "next/link";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Minus,
  Sparkle,
  Sparkles,
  Star,
  Users,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { ExternalRewardOverview, StaffOverviewData } from "../_lib/overview-data";
import { ExternalOverviewLiveRefresh } from "./external-overview-live-refresh";

type Props = {
  data: StaffOverviewData;
  userName: string;
  resortName: string | null;
};

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const STAR_SLOTS = [1, 2, 3, 4, 5] as const;

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Indian/Maldives",
    }).format(new Date()),
  );

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Partner";
}

function compactDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Indian/Maldives",
  }).format(date);
}

function changeLabel(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue > 0 ? "+" : ""}${numberFormatter.format(safeValue)}%`;
}

function MetricCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  change,
  note,
}: {
  icon: typeof Users;
  iconClassName: string;
  label: string;
  value: string;
  change?: number;
  note: string;
}) {
  const safeChange = Number.isFinite(change) ? (change ?? 0) : 0;
  let ChangeIcon = Minus;
  let changeClassName = "border-slate-300/15 bg-slate-300/10 text-slate-300 hover:bg-slate-300/10";
  if (safeChange > 0) {
    ChangeIcon = ArrowUpRight;
    changeClassName = "border-emerald-300/20 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/10";
  } else if (safeChange < 0) {
    ChangeIcon = ArrowDownRight;
    changeClassName = "border-rose-300/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/10";
  }

  return (
    <article className="group min-w-0 rounded-2xl border border-white/12 bg-[#071b3b]/75 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 ${iconClassName}`}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        {typeof change === "number" ? (
          <Badge title="Compared with the previous period" className={changeClassName}>
            <ChangeIcon className="size-3" />
            {changeLabel(safeChange)}
          </Badge>
        ) : null}
      </div>
      <p className="mt-3 truncate text-slate-300 text-xs sm:text-sm">{label}</p>
      <p className="mt-1 truncate font-semibold text-2xl text-white tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 line-clamp-2 min-h-8 text-[11px] text-slate-400 leading-4 sm:text-xs">{note}</p>
    </article>
  );
}

function RewardStars({ reward }: { reward: ExternalRewardOverview }) {
  const completed = Math.min(reward.maxMonthlyStars, Math.max(0, Math.floor(reward.fullStars)));
  const progressUnits = Math.max(0, reward.starUnits - completed * reward.starThreshold);
  const progress =
    completed >= reward.maxMonthlyStars
      ? 100
      : Math.min(100, (progressUnits / Math.max(reward.starThreshold, 0.01)) * 100);

  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-3"
      role="img"
      aria-label={`${completed} of ${reward.maxMonthlyStars} monthly reward stars completed`}
    >
      {STAR_SLOTS.slice(0, reward.maxMonthlyStars).map((slot) => {
        const index = slot - 1;
        let fill = 0;
        if (index < completed) fill = 100;
        else if (index === completed) fill = progress;
        return (
          <span key={slot} className="relative size-9 shrink-0 sm:size-11" aria-hidden="true">
            <Star className="absolute inset-0 size-full text-violet-300/80" strokeWidth={1.5} />
            {fill > 0 ? (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
                <Star
                  className="size-9 fill-amber-300 text-amber-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.5)] sm:size-11"
                  strokeWidth={1.5}
                />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function HowItWorks({ reward }: { reward: ExternalRewardOverview }) {
  const exampleStars = Math.min(3, reward.maxMonthlyStars);
  const exampleUnits = exampleStars * reward.starThreshold;
  const exampleReward = exampleStars * reward.starBonusPerStarUsd;
  const steps = [
    {
      title: `${numberFormatter.format(reward.starThreshold)} units = 1 star`,
      copy: `Each adult adds ${numberFormatter.format(reward.adultStarUnit)} unit and each child adds ${numberFormatter.format(reward.childStarUnit)} unit.`,
    },
    {
      title: `Each star = ${usdFormatter.format(reward.starBonusPerStarUsd)}`,
      copy: "Completed stars add the configured bonus, while partial progress is also reflected in your monthly reward.",
    },
    {
      title: `Maximum ${reward.maxMonthlyStars} stars monthly`,
      copy: `You can earn up to ${usdFormatter.format(reward.maxMonthlyStars * reward.starBonusPerStarUsd)} in monthly star bonuses.`,
    },
  ];

  return (
    <aside className="min-w-0 self-start rounded-3xl border border-cyan-300/50 bg-[#061733]/94 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:p-5 xl:sticky xl:top-16">
      <div>
        <p className="font-semibold text-white text-xl tracking-tight">How It Works</p>
        <p className="mt-0.5 text-slate-400 text-xs">Your monthly star reward</p>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        {steps.map((step, index) => (
          <div key={step.title} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
            <span className="grid size-9 place-items-center rounded-full border border-[#d58aff] bg-[linear-gradient(145deg,#9c5cff_0%,#714ddb_48%,#4652a8_100%)] font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.32),0_0_18px_rgba(151,88,255,0.32)]">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-white">{step.title}</p>
              <p className="mt-1 text-[11px] text-slate-400 leading-[1.55] sm:text-xs">{step.copy}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 border-white/15 border-t pt-4">
        <p className="font-medium text-white text-xs">Example</p>
        <div
          className="mt-3 flex items-center gap-1.5"
          role="img"
          aria-label={`${exampleStars} completed example stars`}
        >
          {STAR_SLOTS.slice(0, reward.maxMonthlyStars).map((slot) => (
            <Star
              key={`example-${slot}`}
              className={
                slot <= exampleStars
                  ? "size-6 fill-amber-300 text-amber-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.42)]"
                  : "size-6 text-slate-300"
              }
              strokeWidth={1.6}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="mt-3 space-y-1 text-[11px] text-slate-300 leading-4 sm:text-xs">
          <p>
            {exampleStars} stars colored = {numberFormatter.format(exampleUnits)} units
          </p>
          <p>= {usdFormatter.format(exampleReward)} star bonus</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 border-white/15 border-t pt-4">
        <span className="relative grid size-11 shrink-0 place-items-center text-fuchsia-300">
          <Sparkle
            className="size-8 -rotate-12 fill-fuchsia-400/10 drop-shadow-[0_0_12px_rgba(232,121,249,0.55)]"
            strokeWidth={2.25}
          />
          <Sparkle className="absolute top-0 right-0 size-3 text-fuchsia-200" strokeWidth={2.5} />
          <span className="absolute top-0.5 right-2.5 size-1.5 rounded-full bg-cyan-200 shadow-[0_0_8px_rgba(165,243,252,0.95)]" />
        </span>
        <p className="-rotate-1 font-['Segoe_Print','Bradley_Hand',cursive] font-semibold text-[12px] text-white italic leading-[1.35] tracking-[-0.01em] sm:text-[13px]">
          <span className="block">Your guests&apos; memories fuel your</span>
          <span className="block">rewards!</span>
        </p>
      </div>
    </aside>
  );
}

export function ExternalStaffOverview({ data, userName, resortName }: Props) {
  const reward = data.externalReward ?? {
    commissionUsd: data.metrics.earnedCommissionUsd,
    earnedUsd: data.metrics.earnedCommissionUsd,
    paidOutUsd: 0,
    starUnits: 0,
    fullStars: 0,
    starBonusUsd: 0,
    starBonusPerStarUsd: 10,
    starRewardUsd: 0,
    starThreshold: 10,
    adultStarUnit: 1,
    childStarUnit: 0.5,
    monthlyEligibleGuests: 0,
    eligibleGuestChange: 0,
    earningsChange: 0,
    payoutChange: 0,
    maxMonthlyStars: 5,
  };
  const visibleBookings = data.recentBookings.slice(0, 5);

  return (
    <div className="relative isolate -m-2 min-h-[calc(100svh-3rem)] overflow-hidden rounded-2xl bg-[#031229] text-white sm:-m-4 sm:rounded-3xl md:-m-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-20 h-[30rem] bg-center bg-cover opacity-60"
        style={{ backgroundImage: "url('/external-dashboard-night.png')" }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,13,36,0.22)_0%,rgba(3,18,41,0.84)_30%,#031229_68%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_5%,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,0.16),transparent_25%)]" />

      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-3 sm:gap-6 sm:p-5 lg:p-7">
        <section className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className="border-cyan-300/25 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/10">
                <Sparkles className="size-3" /> External partner
              </Badge>
              <ExternalOverviewLiveRefresh />
              {resortName ? <span className="truncate text-slate-300 text-xs">{resortName}</span> : null}
            </div>
            <h1 className="font-semibold text-2xl text-white tracking-tight sm:text-3xl lg:text-4xl">
              {greeting()}, {firstName(userName)}!
            </h1>
            <p className="mt-1.5 max-w-2xl text-slate-300 text-sm sm:text-base">
              Your guest impact, commissions, and monthly star rewards at a glance.
            </p>
          </div>
          <Button
            asChild
            className="w-full border border-violet-300/25 bg-violet-500/20 text-white shadow-[0_0_30px_rgba(139,92,246,0.18)] hover:bg-violet-500/30 sm:w-auto"
          >
            <Link href="/dashboard/external/bookings?new=1">
              Create booking <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </section>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] 2xl:grid-cols-[minmax(0,1fr)_19rem]">
          <main className="flex min-w-0 flex-col gap-5">
            <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              <MetricCard
                icon={Users}
                iconClassName="text-cyan-300"
                label="Eligible guests"
                value={numberFormatter.format(reward.monthlyEligibleGuests)}
                change={reward.eligibleGuestChange}
                note="Completed and signed this month"
              />
              <MetricCard
                icon={CalendarDays}
                iconClassName="text-violet-300"
                label="Total bookings"
                value={numberFormatter.format(data.metrics.totalBookings)}
                change={data.metrics.bookingChange}
                note={`${data.metrics.completedBookings} successfully completed`}
              />
              <MetricCard
                icon={CircleDollarSign}
                iconClassName="text-fuchsia-300"
                label="Total earnings"
                value={usdFormatter.format(reward.earnedUsd)}
                change={reward.earningsChange}
                note="Commission plus star rewards"
              />
              <MetricCard
                icon={WalletCards}
                iconClassName="text-emerald-300"
                label="Total payouts"
                value={usdFormatter.format(reward.paidOutUsd)}
                change={reward.payoutChange}
                note="Completed payout requests"
              />
            </section>

            <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
              <article className="overflow-hidden rounded-3xl border border-violet-300/30 bg-[linear-gradient(135deg,rgba(75,29,132,0.72),rgba(13,40,91,0.82))] p-4 shadow-[0_22px_70px_rgba(15,6,45,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl sm:p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-fuchsia-400/10 text-fuchsia-300 ring-1 ring-fuchsia-300/25">
                      <Star className="size-6" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-lg text-white">Your star reward progress</h2>
                      <p className="mt-0.5 text-slate-300 text-xs sm:text-sm">
                        Bring more eligible guests, fill your stars, and grow your monthly bonus.
                      </p>
                    </div>
                  </div>

                  <RewardStars reward={reward} />

                  <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/15 p-3 sm:grid-cols-3 sm:p-4">
                    <div>
                      <p className="text-slate-400 text-xs">Progress units</p>
                      <p className="mt-1 font-semibold text-white">{numberFormatter.format(reward.starUnits)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Stars colored</p>
                      <p className="mt-1 font-semibold text-white">
                        {reward.fullStars}/{reward.maxMonthlyStars}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Star reward</p>
                      <p className="mt-1 font-semibold text-amber-300">{usdFormatter.format(reward.starRewardUsd)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-slate-300 text-xs">
                      Only completed, guest-signed, chargeable bookings count toward stars.
                    </p>
                    <Button
                      asChild
                      size="sm"
                      className="w-full bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 sm:w-auto"
                    >
                      <Link href="/dashboard/external/payout">
                        View rewards <ArrowRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>

              <article className="min-w-0 rounded-3xl border border-white/12 bg-[#071b3b]/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-white">Recent bookings</h2>
                    <p className="mt-0.5 text-slate-400 text-xs">Latest guests in your scope</p>
                  </div>
                  <Link
                    href="/dashboard/external/bookings"
                    className="shrink-0 text-cyan-300 text-xs hover:text-cyan-200"
                  >
                    View all
                  </Link>
                </div>

                <div className="mt-4 flex flex-col divide-y divide-white/8">
                  {visibleBookings.length ? (
                    visibleBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="grid size-9 place-items-center rounded-full bg-blue-500/15 text-blue-200 ring-1 ring-blue-300/15">
                          <Users className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm text-white">{booking.plan}</p>
                          <p className="truncate text-[11px] text-slate-400">
                            {booking.guests} {booking.guests === 1 ? "guest" : "guests"} · {compactDate(booking.joined)}
                          </p>
                        </div>
                        <Badge className="border-blue-300/15 bg-blue-400/10 text-blue-200 hover:bg-blue-400/10">
                          {booking.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <CalendarDays className="mx-auto size-8 text-slate-500" />
                      <p className="mt-3 text-slate-300 text-sm">No bookings yet</p>
                      <p className="mt-1 text-slate-500 text-xs">Your latest bookings will appear here.</p>
                    </div>
                  )}
                </div>
              </article>
            </section>

            <section className="relative overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#071b3b]/78 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(34,211,238,0.14),transparent_30%),linear-gradient(100deg,rgba(124,58,237,0.12),transparent_55%)]" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/20">
                    <Sparkles className="size-6" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-lg text-white">More guests. More stars.</h2>
                    <p className="mt-1 max-w-2xl text-slate-300 text-sm">
                      Thoughtful guest experiences build stronger partnerships and unlock better monthly rewards.
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="w-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  <Link href="/dashboard/external/package">
                    Browse packages <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </div>
            </section>
          </main>

          <HowItWorks reward={reward} />
        </div>
      </div>
    </div>
  );
}
