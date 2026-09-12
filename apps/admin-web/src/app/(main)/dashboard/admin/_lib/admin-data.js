import "server-only";

import { requirePermission } from "@ephemeris/auth";
import { query, transaction } from "@ephemeris/db";
import { bookingSelectQuery } from "@ephemeris/db/helpers";
import { listInvoices, listInvoiceWorkflows } from "@ephemeris/db/invoices";
import { presenceStatus } from "@ephemeris/db/presence";
import { resortCoverageStatus } from "@ephemeris/db/resort-coverage";

import { selectAdminNotifications, syncAdminNotifications } from "@/lib/admin-notifications";

export async function getOverview() {
  await requirePermission("admin.overview", ["admin"]);
  const [bookingStats, resortStats, userStats, recentBookings] = await Promise.all([
    query(`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status IN ('pending', 'active', 'rescheduled'))::int AS open,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COALESCE(SUM(invoice_total_usd) FILTER (WHERE status IN ('active', 'completed', 'rescheduled')), 0)::numeric AS revenue
      FROM bookings`),
    query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM resorts`),
    query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'active')::int AS active,
      COUNT(*) FILTER (WHERE role IN ('internal', 'external'))::int AS staff FROM users`),
    query(`${bookingSelectQuery} ORDER BY b.created_at DESC LIMIT 6`),
  ]);

  return {
    bookings: bookingStats.rows[0],
    resorts: resortStats.rows[0],
    users: userStats.rows[0],
    recentBookings: recentBookings.rows,
  };
}

export async function getBookings() {
  await requirePermission("admin.bookings", ["admin"]);
  const { rows } = await query(`${bookingSelectQuery} ORDER BY b.event_date DESC, b.created_at DESC LIMIT 200`);
  return rows;
}

export async function getBookingOptions() {
  await requirePermission("admin.bookings", ["admin"]);
  const [packages, staff, resorts] = await Promise.all([
    query(`SELECT id, name, resort_id, is_active FROM packages ORDER BY is_active DESC, name`),
    query(`SELECT id, name, role, resort_id, status FROM users
      WHERE role IN ('admin', 'internal', 'external')
      ORDER BY status = 'active' DESC, name`),
    query(`SELECT id, name, status FROM resorts ORDER BY status = 'active' DESC, name`),
  ]);

  return {
    packages: packages.rows,
    staff: staff.rows,
    resorts: resorts.rows,
  };
}

export async function getCalendarOptions() {
  await requirePermission("admin.calendar", ["admin"]);
  const [resorts, packages] = await Promise.all([
    query(`SELECT id, name, timezone, status
      FROM resorts
      ORDER BY status = 'active' DESC, name`),
    query(`SELECT id, name, resort_id, is_active
      FROM packages
      ORDER BY is_active DESC, name`),
  ]);

  return {
    resorts: resorts.rows,
    packages: packages.rows,
  };
}

export async function getResorts() {
  await requirePermission("admin.resorts", ["admin"]);
  const { rows } = await query(`
    SELECT r.*,
      COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'active' AND u.role IN ('internal', 'external'))::int AS active_staff_count,
      COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'active' AND u.role = 'internal')::int AS active_internal_count,
      COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'active' AND u.role = 'external')::int AS active_external_count,
      COUNT(DISTINCT b.id)::int AS total_bookings_count,
      COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('pending', 'active', 'rescheduled'))::int AS open_bookings_count
    FROM resorts r
    LEFT JOIN users u ON u.resort_id = r.id
    LEFT JOIN bookings b ON b.resort_id = r.id
    GROUP BY r.id
    ORDER BY r.name`);

  return rows.map((resort) => ({
    ...resort,
    coverage_status: resortCoverageStatus({
      resortStatus: resort.status,
      activeInternalCount: resort.active_internal_count,
      activeExternalCount: resort.active_external_count,
    }),
  }));
}

export async function getPackages() {
  await requirePermission("admin.packages", ["admin"]);
  const { rows } = await query(`
    SELECT p.id, p.name, p.package_type, p.experience_type, p.location, p.description, p.schedule,
      p.resort_id, p.adult_price_usd, p.child_price_usd, p.child_age_range, p.is_chargeable,
      p.is_active, p.image_data IS NOT NULL AS has_image,
      CASE WHEN p.image_data IS NULL THEN NULL ELSE CONCAT('/api/packages/', p.id, '/image') END AS image_url,
      p.created_at, p.updated_at, r.name AS resort_name,
      COALESCE((
        SELECT json_agg(active_inclusion.label ORDER BY active_inclusion.sort_order)
        FROM package_inclusions active_inclusion
        WHERE active_inclusion.package_id = p.id AND active_inclusion.is_active
      ), '[]') AS inclusions
    FROM packages p
    LEFT JOIN resorts r ON r.id = p.resort_id
    ORDER BY p.name`);
  return rows;
}

export async function getPackageResortOptions() {
  await requirePermission("admin.packages", ["admin"]);
  const { rows } = await query("SELECT id, name FROM resorts ORDER BY name");
  return rows;
}

export async function getUsers() {
  await requirePermission("admin.users", ["admin"]);
  const [users, resorts] = await Promise.all([
    query(`SELECT u.id, u.name, u.email, u.phone, u.role, u.status, u.resort_id,
      u.created_at, u.updated_at, u.last_seen_at, u.last_active_at, r.name AS resort_name,
      COUNT(b.id)::int AS total_booking
      FROM users u
      LEFT JOIN resorts r ON r.id = u.resort_id
      LEFT JOIN bookings b ON b.staff_id = u.id
      GROUP BY u.id, r.id
      ORDER BY u.created_at DESC`),
    query("SELECT id, name, location, status FROM resorts ORDER BY name"),
  ]);
  const now = Date.now();
  return {
    users: users.rows.map((user) => {
      let presence = null;
      if (["internal", "external"].includes(user.role)) {
        presence =
          user.status === "active"
            ? presenceStatus({ lastSeenAt: user.last_seen_at, lastActiveAt: user.last_active_at }, now)
            : "offline";
      }
      return { ...user, presence };
    }),
    resorts: resorts.rows,
  };
}

export async function getFinance() {
  await requirePermission("admin.finance", ["admin"]);
  const [summary, monthly, daily, resorts, payouts] = await Promise.all([
    query(`SELECT
      COUNT(*)::int AS total_bookings,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_bookings,
      COALESCE(SUM(base_total_usd) FILTER (WHERE status = 'completed'), 0)::numeric AS base_total,
      COALESCE(SUM(service_charge_10_usd) FILTER (WHERE status = 'completed'), 0)::numeric AS service_charge,
      COALESCE(SUM(gst_17_usd) FILTER (WHERE status = 'completed'), 0)::numeric AS gst,
      COALESCE(SUM(invoice_total_usd) FILTER (WHERE status IN ('active', 'completed', 'rescheduled')), 0)::numeric AS invoice_total,
      COALESCE(SUM(operation_share_50_usd) FILTER (WHERE status = 'completed'), 0)::numeric AS resort_share,
      COALESCE(SUM(company_share_50_usd) FILTER (WHERE status = 'completed'), 0)::numeric AS company_share,
      COALESCE(SUM(staff_commission_5_usd) FILTER (WHERE status = 'completed'), 0)::numeric AS staff_commission,
      (SELECT COUNT(*)::int FROM payout_requests WHERE status IN ('requested', 'processed')) AS open_payouts,
      (SELECT COALESCE(SUM(amount_usd), 0)::numeric
        FROM payout_requests WHERE status IN ('requested', 'processed')) AS open_payout_total,
      (SELECT COALESCE(SUM(amount_usd), 0)::numeric
        FROM payout_requests WHERE status = 'completed') AS completed_payout_total,
      NULLIF(GREATEST(
        COALESCE(MAX(updated_at), '-infinity'::timestamptz),
        COALESCE((SELECT MAX(updated_at) FROM payout_requests), '-infinity'::timestamptz)
      ), '-infinity'::timestamptz) AS last_updated_at
      FROM bookings`),
    query(`SELECT
      COUNT(*) FILTER (
        WHERE event_date >= date_trunc('month', current_date)
          AND event_date < date_trunc('month', current_date) + interval '1 month'
      )::int AS current_total_bookings,
      COUNT(*) FILTER (
        WHERE status = 'completed'
          AND event_date >= date_trunc('month', current_date)
          AND event_date < date_trunc('month', current_date) + interval '1 month'
      )::int AS current_completed_bookings,
      COALESCE(SUM(invoice_total_usd) FILTER (
        WHERE status IN ('active', 'completed', 'rescheduled')
          AND event_date >= date_trunc('month', current_date)
          AND event_date < date_trunc('month', current_date) + interval '1 month'
      ), 0)::numeric AS current_revenue,
      COALESCE(SUM(company_share_50_usd) FILTER (
        WHERE status = 'completed'
          AND event_date >= date_trunc('month', current_date)
          AND event_date < date_trunc('month', current_date) + interval '1 month'
      ), 0)::numeric AS current_company_share,
      COALESCE(SUM(staff_commission_5_usd) FILTER (
        WHERE status = 'completed'
          AND event_date >= date_trunc('month', current_date)
          AND event_date < date_trunc('month', current_date) + interval '1 month'
      ), 0)::numeric AS current_staff_commission,
      COUNT(*) FILTER (
        WHERE event_date >= date_trunc('month', current_date) - interval '1 month'
          AND event_date < date_trunc('month', current_date)
      )::int AS previous_total_bookings,
      COUNT(*) FILTER (
        WHERE status = 'completed'
          AND event_date >= date_trunc('month', current_date) - interval '1 month'
          AND event_date < date_trunc('month', current_date)
      )::int AS previous_completed_bookings,
      COALESCE(SUM(invoice_total_usd) FILTER (
        WHERE status = 'completed'
          AND event_date >= date_trunc('month', current_date) - interval '1 month'
          AND event_date < date_trunc('month', current_date)
      ), 0)::numeric AS previous_revenue,
      COALESCE(SUM(company_share_50_usd) FILTER (
        WHERE status = 'completed'
          AND event_date >= date_trunc('month', current_date) - interval '1 month'
          AND event_date < date_trunc('month', current_date)
      ), 0)::numeric AS previous_company_share,
      COALESCE(SUM(staff_commission_5_usd) FILTER (
        WHERE status = 'completed'
          AND event_date >= date_trunc('month', current_date) - interval '1 month'
          AND event_date < date_trunc('month', current_date)
      ), 0)::numeric AS previous_staff_commission
      FROM bookings`),
    query(`WITH days AS (
        SELECT generate_series(current_date - interval '6 days', current_date, interval '1 day')::date AS day
      ), booking_daily AS (
        SELECT event_date AS day,
          COALESCE(SUM(invoice_total_usd), 0)::numeric AS revenue
        FROM bookings
        WHERE status = 'completed'
          AND event_date BETWEEN current_date - interval '6 days' AND current_date
        GROUP BY event_date
      ), payout_daily AS (
        SELECT paid_at::date AS day,
          COALESCE(SUM(amount_usd), 0)::numeric AS payouts
        FROM payout_requests
        WHERE status = 'completed'
          AND paid_at::date BETWEEN current_date - interval '6 days' AND current_date
        GROUP BY paid_at::date
      )
      SELECT to_char(days.day, 'YYYY-MM-DD') AS day, COALESCE(booking_daily.revenue, 0)::numeric AS revenue,
        COALESCE(payout_daily.payouts, 0)::numeric AS payouts
      FROM days
      LEFT JOIN booking_daily ON booking_daily.day = days.day
      LEFT JOIN payout_daily ON payout_daily.day = days.day
      ORDER BY days.day`),
    query(`SELECT r.id, r.name, r.code,
      COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed_bookings,
      COALESCE(SUM(b.invoice_total_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric AS invoice_total,
      COALESCE(SUM(b.operation_share_50_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric AS resort_share
      FROM resorts r LEFT JOIN bookings b ON b.resort_id = r.id
      GROUP BY r.id ORDER BY invoice_total DESC`),
    query(`SELECT pr.*, u.name AS requester_name, u.email AS requester_email, u.role AS requester_role,
      r.name AS resort_name, reviewer.name AS reviewed_by_name,
      i.id AS invoice_id, i.invoice_number
      FROM payout_requests pr
      JOIN users u ON u.id = pr.requester_id
      LEFT JOIN resorts r ON r.id = pr.resort_id
      LEFT JOIN users reviewer ON reviewer.id = pr.reviewed_by
      LEFT JOIN invoices i ON i.payout_request_id = pr.id AND i.invoice_type = 'staff_payout'
      ORDER BY CASE pr.status WHEN 'requested' THEN 0 WHEN 'processed' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END,
      pr.created_at DESC LIMIT 100`),
  ]);
  return {
    summary: summary.rows[0],
    monthly: monthly.rows[0],
    daily: daily.rows,
    resorts: resorts.rows,
    payouts: payouts.rows,
  };
}

export async function getInvoiceDashboard() {
  await requirePermission("admin.finance", ["admin"]);
  const database = { query };
  const [invoices, workflows] = await Promise.all([listInvoices(database), listInvoiceWorkflows(database)]);
  return { invoices, workflows };
}

export async function getAuditLogs() {
  await requirePermission("admin.logs", ["admin"]);
  const { rows } = await query(`SELECT al.*, u.name AS actor_name, u.email AS actor_email
    FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_id
    ORDER BY al.created_at DESC LIMIT 200`);
  return rows;
}

export async function getRewardSettings() {
  await requirePermission("admin.settings", ["admin"]);
  const { rows } = await query(`SELECT star_adult_unit, star_child_unit, star_threshold, star_bonus_usd,
    updated_by, updated_at FROM sky_settings WHERE id = true`);
  return rows[0] || null;
}

export async function getNotifications(userId) {
  await requirePermission("admin.notifications", ["admin"]);
  return transaction(async (client) => {
    await syncAdminNotifications(client);
    return selectAdminNotifications(client, userId);
  });
}
