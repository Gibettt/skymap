-- Migration 014: CQRS Materialized Views
-- Creates read-optimised materialized views for dashboard, staff performance,
-- resort analytics, monthly revenue trends, and booking pipeline/funnel.
-- Each view has a UNIQUE INDEX to allow REFRESH MATERIALIZED VIEW CONCURRENTLY.

BEGIN;

--------------------------------------------------------------------------------
-- 1. mv_dashboard_kpi — Admin overview dashboard
--------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_kpi AS
SELECT
  -- Single-row aggregate; use a constant key for the UNIQUE INDEX
  1 AS kpi_key,

  -- Booking counts
  COUNT(*)::int AS total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'pending_review')::int AS bookings_pending_review,
  COUNT(*) FILTER (WHERE b.status = 'accepted')::int AS bookings_accepted,
  COUNT(*) FILTER (WHERE b.status = 'booked')::int AS bookings_booked,
  COUNT(*) FILTER (WHERE b.status = 'finished_experience')::int AS bookings_finished,
  COUNT(*) FILTER (WHERE b.status = 'cancelled')::int AS bookings_cancelled,
  COUNT(*) FILTER (WHERE b.status = 'rejected')::int AS bookings_rejected,

  -- Revenue (finished bookings only)
  COALESCE(SUM(b.invoice_total_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS total_revenue_usd,
  COALESCE(SUM(b.base_total_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS total_base_usd,
  COALESCE(SUM(b.service_charge_10_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS total_service_charge,
  COALESCE(SUM(b.gst_17_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS total_gst,
  COALESCE(SUM(b.operation_share_50_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS total_operation_share,
  COALESCE(SUM(b.company_share_50_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS total_company_share,

  -- Commissions paid (finished + signed)
  COALESCE(SUM(b.staff_commission_5_usd) FILTER (
    WHERE b.status = 'finished_experience' AND b.signed_by_guest = true
  ), 0)::numeric(12,2) AS total_commissions_paid,

  -- Staff and resort counts
  (SELECT COUNT(*) FROM users WHERE role IN ('internal', 'external') AND status = 'active')::int AS active_staff_count,
  (SELECT COUNT(*) FROM resorts WHERE status = 'active')::int AS active_resorts_count,

  -- Average guest rating
  COALESCE((SELECT AVG(fs.rating) FROM feedback_submissions fs), 0)::numeric(3,2) AS avg_guest_rating,

  -- This month metrics
  COUNT(*) FILTER (
    WHERE date_trunc('month', b.booking_date) = date_trunc('month', CURRENT_DATE)
  )::int AS bookings_this_month,
  COALESCE(SUM(b.invoice_total_usd) FILTER (
    WHERE b.status = 'finished_experience'
      AND date_trunc('month', b.booking_date) = date_trunc('month', CURRENT_DATE)
  ), 0)::numeric(12,2) AS revenue_this_month,

  -- Snapshot timestamp
  now() AS refreshed_at

FROM bookings b;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_kpi_key
  ON mv_dashboard_kpi (kpi_key);


--------------------------------------------------------------------------------
-- 2. mv_staff_performance — Per-staff performance metrics
--------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_staff_performance AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.role AS user_role,
  COALESCE(r.name, 'N/A') AS resort_name,

  -- Booking counts
  COUNT(b.id)::int AS total_bookings_handled,
  COUNT(b.id) FILTER (WHERE b.status = 'finished_experience')::int AS finished_bookings,

  -- Commission (valid = finished_experience + signed_by_guest)
  COALESCE(SUM(b.staff_commission_5_usd) FILTER (
    WHERE b.status = 'finished_experience' AND b.signed_by_guest = true
  ), 0)::numeric(12,2) AS total_commission_usd,

  -- Star points: 1 per valid booking + 0.5 per child in valid bookings
  COALESCE(
    SUM(1 + 0.5 * b.child_count) FILTER (
      WHERE b.status = 'finished_experience' AND b.signed_by_guest = true
    ), 0
  )::numeric(10,2) AS total_star_points,

  -- Full stars: floor(total_star_points / 10), max 5
  LEAST(
    FLOOR(
      COALESCE(
        SUM(1 + 0.5 * b.child_count) FILTER (
          WHERE b.status = 'finished_experience' AND b.signed_by_guest = true
        ), 0
      ) / 10.0
    ), 5
  )::int AS full_stars,

  -- Star bonus: $10 per full star (max 5)
  (LEAST(
    FLOOR(
      COALESCE(
        SUM(1 + 0.5 * b.child_count) FILTER (
          WHERE b.status = 'finished_experience' AND b.signed_by_guest = true
        ), 0
      ) / 10.0
    ), 5
  ) * 10)::numeric(10,2) AS star_bonus_usd,

  -- Average guest rating on their bookings
  COALESCE(AVG(fs.rating), 0)::numeric(3,2) AS avg_guest_rating,

  -- Total guests served
  COALESCE(SUM(b.adult_count + b.child_count) FILTER (
    WHERE b.status = 'finished_experience'
  ), 0)::int AS total_guests_served,

  -- Last booking date
  MAX(b.booking_date) AS last_booking_date

FROM users u
LEFT JOIN bookings b ON b.staff_id = u.id
LEFT JOIN resorts r ON r.id = u.resort_id
LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
WHERE u.role IN ('internal', 'external')
GROUP BY u.id, u.name, u.role, r.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_staff_performance_user_id
  ON mv_staff_performance (user_id);


--------------------------------------------------------------------------------
-- 3. mv_resort_analytics — Per-resort analytics
--------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_resort_analytics AS
SELECT
  r.id AS resort_id,
  r.name AS resort_name,
  r.code AS resort_code,

  COUNT(b.id)::int AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'finished_experience')::int AS finished_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled')::int AS cancelled_bookings,

  COALESCE(SUM(b.invoice_total_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS total_revenue_usd,
  COALESCE(SUM(b.operation_share_50_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS total_operation_share,

  COALESCE(AVG(fs.rating), 0)::numeric(3,2) AS avg_guest_rating,

  COALESCE(SUM(b.adult_count + b.child_count), 0)::int AS total_guests,

  -- Most popular package (by booking count)
  (
    SELECT p2.name
    FROM bookings b2
    JOIN packages p2 ON p2.id = b2.package_id
    WHERE b2.resort_id = r.id
    GROUP BY p2.name
    ORDER BY COUNT(*) DESC
    LIMIT 1
  ) AS most_popular_package_name,

  -- Active staff at this resort
  (
    SELECT COUNT(*)
    FROM users u2
    WHERE u2.resort_id = r.id
      AND u2.role IN ('internal', 'external')
      AND u2.status = 'active'
  )::int AS active_staff_count

FROM resorts r
LEFT JOIN bookings b ON b.resort_id = r.id
LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
GROUP BY r.id, r.name, r.code;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_resort_analytics_resort_id
  ON mv_resort_analytics (resort_id);


--------------------------------------------------------------------------------
-- 4. mv_monthly_revenue — Monthly revenue trends (last 12 months)
--------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_revenue AS
SELECT
  date_trunc('month', b.booking_date)::date AS month,
  EXTRACT(YEAR FROM b.booking_date)::int AS year,
  EXTRACT(MONTH FROM b.booking_date)::int AS month_number,

  COUNT(*)::int AS booking_count,
  COALESCE(SUM(b.invoice_total_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS revenue_usd,
  COALESCE(SUM(b.base_total_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS base_total_usd,
  COALESCE(SUM(b.service_charge_10_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS service_charge_usd,
  COALESCE(SUM(b.gst_17_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS gst_usd,
  COALESCE(SUM(b.operation_share_50_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS operation_share_usd,
  COALESCE(SUM(b.company_share_50_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS company_share_usd,

  COALESCE(AVG(b.invoice_total_usd) FILTER (WHERE b.status = 'finished_experience'), 0)::numeric(12,2) AS avg_booking_value,

  COALESCE(SUM(b.adult_count + b.child_count), 0)::int AS guest_count

FROM bookings b
WHERE b.booking_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
GROUP BY date_trunc('month', b.booking_date), EXTRACT(YEAR FROM b.booking_date), EXTRACT(MONTH FROM b.booking_date)
ORDER BY month DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_revenue_month
  ON mv_monthly_revenue (month);


--------------------------------------------------------------------------------
-- 5. mv_booking_pipeline — Booking status pipeline/funnel
--------------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_booking_pipeline AS
WITH status_counts AS (
  SELECT
    status,
    COUNT(*)::int AS count,
    COALESCE(AVG(invoice_total_usd), 0)::numeric(12,2) AS avg_value_usd
  FROM bookings
  GROUP BY status
),
totals AS (
  SELECT
    SUM(count)::int AS total_in_pipeline,
    COALESCE(SUM(count) FILTER (WHERE status = 'finished_experience'), 0)::int AS finished_count
  FROM status_counts
)
SELECT
  sc.status::text AS status,
  sc.count,
  CASE
    WHEN t.total_in_pipeline > 0
    THEN ROUND(sc.count * 100.0 / t.total_in_pipeline, 2)
    ELSE 0
  END::numeric(5,2) AS percentage_of_total,
  sc.avg_value_usd,
  t.total_in_pipeline,
  CASE
    WHEN t.total_in_pipeline > 0
    THEN ROUND(t.finished_count * 100.0 / t.total_in_pipeline, 2)
    ELSE 0
  END::numeric(5,2) AS conversion_rate
FROM status_counts sc
CROSS JOIN totals t
ORDER BY sc.count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_booking_pipeline_status
  ON mv_booking_pipeline (status);


--------------------------------------------------------------------------------
-- 6. Refresh function
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_kpi;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_staff_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_resort_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_booking_pipeline;
END;
$$ LANGUAGE plpgsql;

-- Convenience: refresh a single view by name
CREATE OR REPLACE FUNCTION refresh_materialized_view(view_name text)
RETURNS void AS $$
BEGIN
  IF view_name NOT IN (
    'mv_dashboard_kpi',
    'mv_staff_performance',
    'mv_resort_analytics',
    'mv_monthly_revenue',
    'mv_booking_pipeline'
  ) THEN
    RAISE EXCEPTION 'Unknown materialized view: %', view_name;
  END IF;
  EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);
END;
$$ LANGUAGE plpgsql;

COMMIT;
