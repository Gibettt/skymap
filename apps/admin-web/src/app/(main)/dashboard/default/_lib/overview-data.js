import "server-only";

import { requirePermission } from "@ephemeris/auth";
import { query } from "@ephemeris/db";

function percentageChange(current, previous) {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
}

export async function getDefaultOverviewData() {
  await requirePermission("admin.overview", ["admin"]);
  const [bookingMetrics, accountMetrics, activity, recentBookings] = await Promise.all([
    query(`SELECT
      COUNT(*)::int AS total_bookings,
      COUNT(*) FILTER (WHERE created_at >= current_date - interval '29 days')::int AS bookings_current,
      COUNT(*) FILTER (
        WHERE created_at >= current_date - interval '59 days'
          AND created_at < current_date - interval '29 days'
      )::int AS bookings_previous,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_bookings,
      COALESCE(SUM(invoice_total_usd) FILTER (
        WHERE status IN ('active', 'completed', 'rescheduled')
      ), 0)::numeric AS total_revenue,
      COALESCE(SUM(invoice_total_usd) FILTER (
        WHERE status IN ('active', 'completed', 'rescheduled')
          AND event_date >= current_date - interval '29 days'
      ), 0)::numeric AS revenue_current,
      COALESCE(SUM(invoice_total_usd) FILTER (
        WHERE status IN ('active', 'completed', 'rescheduled')
          AND event_date >= current_date - interval '59 days'
          AND event_date < current_date - interval '29 days'
      ), 0)::numeric AS revenue_previous
    FROM bookings`),
    query(`SELECT
      COUNT(*)::int AS total_accounts,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active_accounts
    FROM users`),
    query(`WITH days AS (
      SELECT generate_series(
        current_date - interval '89 days',
        current_date,
        interval '1 day'
      )::date AS date
    )
    SELECT
      to_char(days.date, 'YYYY-MM-DD') AS date,
      COUNT(b.id)::int AS total_bookings,
      COUNT(b.id) FILTER (WHERE b.status IN ('pending', 'active', 'rescheduled'))::int AS open_bookings,
      COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed_bookings
    FROM days
    LEFT JOIN bookings b ON b.event_date = days.date
    GROUP BY days.date
    ORDER BY days.date`),
    query(`SELECT
      b.id::text AS id,
      b.guest_name AS name,
      b.booking_code AS email,
      p.name AS plan,
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
    JOIN packages p ON p.id = b.package_id
    ORDER BY b.created_at DESC, b.event_date DESC
    LIMIT 100`),
  ]);

  const bookings = bookingMetrics.rows[0];
  const accounts = accountMetrics.rows[0];
  const totalBookings = Number(bookings.total_bookings);
  const completedBookings = Number(bookings.completed_bookings);
  const totalAccounts = Number(accounts.total_accounts);
  const activeAccounts = Number(accounts.active_accounts);

  return {
    metrics: {
      totalRevenue: Number(bookings.total_revenue),
      revenueChange: percentageChange(bookings.revenue_current, bookings.revenue_previous),
      newBookings: Number(bookings.bookings_current),
      bookingChange: percentageChange(bookings.bookings_current, bookings.bookings_previous),
      activeAccounts,
      activeAccountRate: totalAccounts > 0 ? (activeAccounts / totalAccounts) * 100 : 0,
      completionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
      totalBookings,
      completedBookings,
    },
    activity: activity.rows.map((row) => ({
      date: row.date,
      totalBookings: Number(row.total_bookings),
      openBookings: Number(row.open_bookings),
      completedBookings: Number(row.completed_bookings),
    })),
    recentBookings: recentBookings.rows,
  };
}
