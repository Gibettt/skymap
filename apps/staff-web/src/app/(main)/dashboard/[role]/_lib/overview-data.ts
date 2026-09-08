import "server-only";

import { query } from "@ephemeris/db";
import { bookingScopeForUser } from "@ephemeris/db/scopes";

type StaffUser = {
  id: string;
  role: "internal" | "external";
  resort_id: string | null;
};

export type StaffOverviewMetrics = {
  earnedCommissionUsd: number;
  commissionChange: number;
  newBookings: number;
  bookingChange: number;
  openBookings: number;
  openBookingRate: number;
  completionRate: number;
  totalBookings: number;
  completedBookings: number;
};

export type StaffBookingActivityPoint = {
  date: string;
  totalBookings: number;
  openBookings: number;
  completedBookings: number;
};

export type StaffRecentBooking = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  billing: string;
  joined: string;
};

export type StaffOverviewData = {
  metrics: StaffOverviewMetrics;
  activity: StaffBookingActivityPoint[];
  recentBookings: StaffRecentBooking[];
};

const asNumber = (value: unknown) => Number(value ?? 0);

function percentageChange(current: unknown, previous: unknown) {
  const currentValue = asNumber(current);
  const previousValue = asNumber(previous);

  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
}

function emptyActivity(): StaffBookingActivityPoint[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: 90 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (89 - index));

    return {
      date: date.toISOString().slice(0, 10),
      totalBookings: 0,
      openBookings: 0,
      completedBookings: 0,
    };
  });
}

export async function getStaffOverviewData(user: StaffUser, permissions: string[]): Promise<StaffOverviewData> {
  const metrics: StaffOverviewMetrics = {
    earnedCommissionUsd: 0,
    commissionChange: 0,
    newBookings: 0,
    bookingChange: 0,
    openBookings: 0,
    openBookingRate: 0,
    completionRate: 0,
    totalBookings: 0,
    completedBookings: 0,
  };
  let activity = emptyActivity();
  let recentBookings: StaffRecentBooking[] = [];
  const tasks: Promise<void>[] = [];

  if (permissions.includes("staff.bookings")) {
    const scope = bookingScopeForUser(user, "b");

    tasks.push(
      (async () => {
        const [bookingMetricsResult, activityResult, recentBookingsResult] = await Promise.all([
          query(
            `SELECT
               COUNT(*)::int AS total_bookings,
               COUNT(*) FILTER (
                 WHERE b.created_at >= current_date - interval '29 days'
               )::int AS bookings_current,
               COUNT(*) FILTER (
                 WHERE b.created_at >= current_date - interval '59 days'
                   AND b.created_at < current_date - interval '29 days'
               )::int AS bookings_previous,
               COUNT(*) FILTER (
                 WHERE b.status IN ('pending', 'active', 'rescheduled')
               )::int AS open_bookings,
               COUNT(*) FILTER (WHERE b.status = 'completed')::int AS completed_bookings
             FROM bookings b
             WHERE ${scope.whereClause}`,
            scope.values,
          ),
          query(
            `WITH days AS (
               SELECT generate_series(
                 current_date - interval '89 days',
                 current_date,
                 interval '1 day'
               )::date AS date
             )
             SELECT
               to_char(days.date, 'YYYY-MM-DD') AS date,
               COUNT(b.id)::int AS total_bookings,
               COUNT(b.id) FILTER (
                 WHERE b.status IN ('pending', 'active', 'rescheduled')
               )::int AS open_bookings,
               COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed_bookings
             FROM days
             LEFT JOIN bookings b
               ON b.event_date = days.date
              AND ${scope.whereClause}
             GROUP BY days.date
             ORDER BY days.date`,
            scope.values,
          ),
          query(
            `SELECT
               b.id::text AS id,
               b.guest_name AS name,
               b.booking_code AS email,
               COALESCE(p.name, 'Unassigned package') AS plan,
               CASE
                 WHEN b.status = 'completed' THEN 'Completed'
                 WHEN b.status = 'active' THEN 'Active'
                 WHEN b.status = 'rescheduled' THEN 'Rescheduled'
                 WHEN b.status = 'pending' THEN 'Pending'
                 WHEN b.status IN ('cancelled_by_guest', 'cancelled_weather', 'rejected') THEN 'Cancelled'
                 ELSE replace(b.status::text, '_', ' ')
               END AS status,
               CASE
                 WHEN b.status = 'completed' THEN 'Paid'
                 WHEN b.status IN ('cancelled_by_guest', 'cancelled_weather', 'rejected') THEN 'Cancelled'
                 ELSE 'Pending'
               END AS billing,
               CONCAT(b.event_date, 'T', COALESCE(b.time_start, '00:00:00')) AS joined
             FROM bookings b
             LEFT JOIN packages p ON p.id = b.package_id
             WHERE ${scope.whereClause}
             ORDER BY b.created_at DESC, b.event_date DESC
             LIMIT 100`,
            scope.values,
          ),
        ]);

        const bookingMetrics = bookingMetricsResult.rows[0] ?? {};
        metrics.totalBookings = asNumber(bookingMetrics.total_bookings);
        metrics.newBookings = asNumber(bookingMetrics.bookings_current);
        metrics.bookingChange = percentageChange(bookingMetrics.bookings_current, bookingMetrics.bookings_previous);
        metrics.openBookings = asNumber(bookingMetrics.open_bookings);
        metrics.completedBookings = asNumber(bookingMetrics.completed_bookings);
        metrics.openBookingRate = metrics.totalBookings > 0 ? (metrics.openBookings / metrics.totalBookings) * 100 : 0;
        metrics.completionRate =
          metrics.totalBookings > 0 ? (metrics.completedBookings / metrics.totalBookings) * 100 : 0;

        activity = activityResult.rows.map((row: Record<string, unknown>) => ({
          date: String(row.date),
          totalBookings: asNumber(row.total_bookings),
          openBookings: asNumber(row.open_bookings),
          completedBookings: asNumber(row.completed_bookings),
        }));
        recentBookings = recentBookingsResult.rows.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          name: String(row.name),
          email: String(row.email),
          plan: String(row.plan),
          status: String(row.status),
          billing: String(row.billing),
          joined: String(row.joined),
        }));
      })(),
    );
  }

  if (permissions.includes("staff.finance")) {
    tasks.push(
      query(
        `SELECT
           COALESCE(SUM(b.staff_commission_5_usd) FILTER (
             WHERE b.status = 'completed'
               AND b.signed_by_guest = true
               AND p.is_chargeable = true
           ), 0)::numeric AS commission_total,
           COALESCE(SUM(b.staff_commission_5_usd) FILTER (
             WHERE b.status = 'completed'
               AND b.signed_by_guest = true
               AND p.is_chargeable = true
               AND b.event_date >= current_date - interval '29 days'
           ), 0)::numeric AS commission_current,
           COALESCE(SUM(b.staff_commission_5_usd) FILTER (
             WHERE b.status = 'completed'
               AND b.signed_by_guest = true
               AND p.is_chargeable = true
               AND b.event_date >= current_date - interval '59 days'
               AND b.event_date < current_date - interval '29 days'
           ), 0)::numeric AS commission_previous
         FROM bookings b
         JOIN packages p ON p.id = b.package_id
         WHERE b.staff_id = $1`,
        [user.id],
      ).then((result) => {
        const commission = result.rows[0] ?? {};
        metrics.earnedCommissionUsd = asNumber(commission.commission_total);
        metrics.commissionChange = percentageChange(commission.commission_current, commission.commission_previous);
      }),
    );
  }

  await Promise.all(tasks);
  return { metrics, activity, recentBookings };
}
