-- Migration 015: unified booking lifecycle, resort RBAC, dynamic rewards,
-- bank payouts, reschedule history, and multi-resort catalogue support.
BEGIN;

-- Materialized views depend on bookings.status and must be rebuilt after
-- replacing the enum type.
DROP MATERIALIZED VIEW IF EXISTS mv_booking_pipeline;
DROP MATERIALIZED VIEW IF EXISTS mv_monthly_revenue;
DROP MATERIALIZED VIEW IF EXISTS mv_resort_analytics;
DROP MATERIALIZED VIEW IF EXISTS mv_staff_performance;
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_kpi;
DROP VIEW IF EXISTS booking_finance_report;

ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'booking_status' AND e.enumlabel = 'pending_review'
  ) THEN
    ALTER TYPE booking_status RENAME TO booking_status_legacy;
    CREATE TYPE booking_status AS ENUM (
      'pending',
      'active',
      'completed',
      'cancelled_by_guest',
      'cancelled_weather',
      'rescheduled'
    );

    ALTER TABLE bookings
      ALTER COLUMN status TYPE booking_status
      USING (
        CASE status::text
          WHEN 'pending_review' THEN 'pending'
          WHEN 'accepted' THEN 'active'
          WHEN 'booked' THEN 'active'
          WHEN 'finished_experience' THEN 'completed'
          WHEN 'rejected' THEN 'cancelled_by_guest'
          WHEN 'cancelled' THEN 'cancelled_by_guest'
          ELSE 'pending'
        END
      )::booking_status;

    DROP TYPE booking_status_legacy;
  END IF;
END $$;

ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS is_chargeable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS resort_id uuid REFERENCES resorts(id);

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS slug varchar(120),
  ADD COLUMN IF NOT EXISTS contact_email varchar(254),
  ADD COLUMN IF NOT EXISTS whatsapp_number varchar(32);

UPDATE resorts
SET slug = lower(regexp_replace(code, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL OR btrim(slug) = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_resorts_slug ON resorts(slug);
CREATE INDEX IF NOT EXISTS idx_packages_resort_active
  ON packages(resort_id, is_active);

ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_resort_name ON packages(resort_id, name);

-- Existing installations contain one global catalogue. Attach it to the
-- first active resort so the new location routes do not expose mixed prices.
UPDATE packages
SET resort_id = (
  SELECT id FROM resorts ORDER BY (status = 'active') DESC, created_at ASC LIMIT 1
)
WHERE resort_id IS NULL;

-- Internal staff is now location-bound. Preserve existing demo/legacy users
-- by attaching unassigned accounts to the oldest active resort.
UPDATE users
SET resort_id = (
  SELECT id FROM resorts ORDER BY (status = 'active') DESC, created_at ASC LIMIT 1
)
WHERE role = 'internal' AND resort_id IS NULL;

UPDATE bookings b
SET resort_id = u.resort_id
FROM users u
WHERE b.staff_id = u.id AND b.resort_id IS NULL AND u.resort_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS sky_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  star_adult_unit numeric(8,2) NOT NULL DEFAULT 1 CHECK (star_adult_unit >= 0),
  star_child_unit numeric(8,2) NOT NULL DEFAULT 0.5 CHECK (star_child_unit >= 0),
  star_threshold numeric(8,2) NOT NULL DEFAULT 10 CHECK (star_threshold > 0),
  star_bonus_usd numeric(10,2) NOT NULL DEFAULT 10.00 CHECK (star_bonus_usd >= 0),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO sky_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS sky_settings_set_updated_at ON sky_settings;
CREATE TRIGGER sky_settings_set_updated_at
BEFORE UPDATE ON sky_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Replace legacy payment method/account naming with explicit bank details.
ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS bank_name varchar(120),
  ADD COLUMN IF NOT EXISTS account_holder_name varchar(120);

UPDATE payout_requests
SET
  bank_name = COALESCE(NULLIF(bank_name, ''), 'Bank of Maldives'),
  account_holder_name = COALESCE(NULLIF(account_holder_name, ''), NULLIF(account_name, ''), 'Unknown')
WHERE bank_name IS NULL OR account_holder_name IS NULL;

ALTER TABLE payout_requests
  ALTER COLUMN bank_name SET NOT NULL,
  ALTER COLUMN account_holder_name SET NOT NULL;

ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_status_check;
UPDATE payout_requests SET status = 'processed' WHERE status = 'approved';
UPDATE payout_requests SET status = 'completed' WHERE status = 'paid';
ALTER TABLE payout_requests
  ADD CONSTRAINT payout_requests_status_check
  CHECK (status IN ('requested', 'processed', 'completed', 'rejected'));

ALTER TABLE payout_requests
  DROP COLUMN IF EXISTS crypto_wallet,
  DROP COLUMN IF EXISTS crypto_network,
  DROP COLUMN IF EXISTS paypal_email,
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS account_name;

CREATE TABLE IF NOT EXISTS booking_reschedule_history (
  id bigserial PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_event_date date NOT NULL,
  previous_time_start time NOT NULL,
  previous_time_end time NOT NULL,
  new_event_date date NOT NULL,
  new_time_start time NOT NULL,
  new_time_end time NOT NULL,
  reason text,
  changed_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_reschedule_history_booking
  ON booking_reschedule_history(booking_id, created_at DESC);

-- CQRS read models rebuilt against the new lifecycle and reward rules.
CREATE MATERIALIZED VIEW mv_dashboard_kpi AS
SELECT
  1 AS kpi_key,
  COUNT(*)::int AS total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'pending')::int AS bookings_pending,
  COUNT(*) FILTER (WHERE b.status = 'active')::int AS bookings_active,
  COUNT(*) FILTER (WHERE b.status = 'completed')::int AS bookings_completed,
  COUNT(*) FILTER (WHERE b.status IN ('cancelled_by_guest', 'cancelled_weather'))::int AS bookings_cancelled,
  COUNT(*) FILTER (WHERE b.status = 'rescheduled')::int AS bookings_rescheduled,
  COALESCE(SUM(b.invoice_total_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS total_revenue_usd,
  COALESCE(SUM(b.base_total_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS total_base_usd,
  COALESCE(SUM(b.service_charge_10_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS total_service_charge,
  COALESCE(SUM(b.gst_17_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS total_gst,
  COALESCE(SUM(b.operation_share_50_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS total_operation_share,
  COALESCE(SUM(b.company_share_50_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS total_company_share,
  COALESCE(SUM(b.staff_commission_5_usd) FILTER (
    WHERE b.status = 'completed' AND b.signed_by_guest AND p.is_chargeable
  ), 0)::numeric(12,2) AS total_commissions_earned,
  (SELECT COUNT(*) FROM users WHERE role IN ('internal', 'external') AND status = 'active')::int AS active_staff_count,
  (SELECT COUNT(*) FROM resorts WHERE status = 'active')::int AS active_resorts_count,
  COALESCE((SELECT AVG(rating) FROM feedback_submissions), 0)::numeric(3,2) AS avg_guest_rating,
  COUNT(*) FILTER (WHERE date_trunc('month', b.booking_date) = date_trunc('month', CURRENT_DATE))::int AS bookings_this_month,
  COALESCE(SUM(b.invoice_total_usd) FILTER (
    WHERE b.status = 'completed'
      AND date_trunc('month', b.booking_date) = date_trunc('month', CURRENT_DATE)
  ), 0)::numeric(12,2) AS revenue_this_month,
  now() AS refreshed_at
FROM bookings b
JOIN packages p ON p.id = b.package_id;

CREATE UNIQUE INDEX idx_mv_dashboard_kpi_key ON mv_dashboard_kpi(kpi_key);

CREATE MATERIALIZED VIEW mv_staff_performance AS
WITH staff_totals AS (
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.role AS user_role,
    COALESCE(r.name, 'N/A') AS resort_name,
    COUNT(b.id)::int AS total_bookings_handled,
    COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed_bookings,
    COALESCE(SUM(b.staff_commission_5_usd) FILTER (
      WHERE b.status = 'completed' AND b.signed_by_guest AND p.is_chargeable
    ), 0)::numeric(12,2) AS total_commission_usd,
    CASE WHEN u.role = 'external' THEN COALESCE(SUM(
      (b.adult_count * ss.star_adult_unit) + (b.child_count * ss.star_child_unit)
    ) FILTER (
      WHERE b.status = 'completed'
        AND b.signed_by_guest
        AND p.is_chargeable
        AND date_trunc('month', b.event_date) = date_trunc('month', CURRENT_DATE)
    ), 0) ELSE 0 END::numeric(10,2) AS monthly_star_units,
    ss.star_threshold,
    ss.star_bonus_usd,
    COALESCE(AVG(fs.rating), 0)::numeric(3,2) AS avg_guest_rating,
    COALESCE(SUM(b.adult_count + b.child_count) FILTER (WHERE b.status = 'completed'), 0)::int AS total_guests_served,
    MAX(b.booking_date) AS last_booking_date
  FROM users u
  CROSS JOIN sky_settings ss
  LEFT JOIN bookings b ON b.staff_id = u.id
  LEFT JOIN packages p ON p.id = b.package_id
  LEFT JOIN resorts r ON r.id = u.resort_id
  LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
  WHERE u.role IN ('internal', 'external')
  GROUP BY u.id, u.name, u.role, r.name, ss.star_threshold, ss.star_bonus_usd
)
SELECT
  *,
  CASE WHEN user_role = 'external' THEN FLOOR(monthly_star_units / star_threshold)::int ELSE 0 END AS full_stars,
  CASE WHEN user_role = 'external' THEN
    (FLOOR(monthly_star_units / star_threshold) * star_bonus_usd)::numeric(10,2)
    ELSE 0 END AS star_bonus_total_usd,
  CASE WHEN user_role = 'external' THEN
    MOD(monthly_star_units, star_threshold)::numeric(10,2)
    ELSE 0 END AS partial_progress_usd
FROM staff_totals;

CREATE UNIQUE INDEX idx_mv_staff_performance_user_id ON mv_staff_performance(user_id);

CREATE MATERIALIZED VIEW mv_resort_analytics AS
SELECT
  r.id AS resort_id,
  r.name AS resort_name,
  r.code AS resort_code,
  COUNT(b.id)::int AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed')::int AS completed_bookings,
  COUNT(b.id) FILTER (WHERE b.status IN ('cancelled_by_guest', 'cancelled_weather'))::int AS cancelled_bookings,
  COALESCE(SUM(b.invoice_total_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS total_revenue_usd,
  COALESCE(SUM(b.operation_share_50_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS total_operation_share,
  COALESCE(AVG(fs.rating), 0)::numeric(3,2) AS avg_guest_rating,
  COALESCE(SUM(b.adult_count + b.child_count), 0)::int AS total_guests,
  (
    SELECT p2.name FROM bookings b2
    JOIN packages p2 ON p2.id = b2.package_id
    WHERE b2.resort_id = r.id
    GROUP BY p2.name ORDER BY COUNT(*) DESC LIMIT 1
  ) AS most_popular_package_name,
  (SELECT COUNT(*) FROM users u2 WHERE u2.resort_id = r.id AND u2.role IN ('internal', 'external') AND u2.status = 'active')::int AS active_staff_count
FROM resorts r
LEFT JOIN bookings b ON b.resort_id = r.id
LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
GROUP BY r.id, r.name, r.code;

CREATE UNIQUE INDEX idx_mv_resort_analytics_resort_id ON mv_resort_analytics(resort_id);

CREATE MATERIALIZED VIEW mv_monthly_revenue AS
SELECT
  date_trunc('month', b.booking_date)::date AS month,
  EXTRACT(YEAR FROM b.booking_date)::int AS year,
  EXTRACT(MONTH FROM b.booking_date)::int AS month_number,
  COUNT(*)::int AS booking_count,
  COALESCE(SUM(b.invoice_total_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS revenue_usd,
  COALESCE(SUM(b.base_total_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS base_total_usd,
  COALESCE(SUM(b.service_charge_10_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS service_charge_usd,
  COALESCE(SUM(b.gst_17_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS gst_usd,
  COALESCE(SUM(b.operation_share_50_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS operation_share_usd,
  COALESCE(SUM(b.company_share_50_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS company_share_usd,
  COALESCE(AVG(b.invoice_total_usd) FILTER (WHERE b.status = 'completed'), 0)::numeric(12,2) AS avg_booking_value,
  COALESCE(SUM(b.adult_count + b.child_count), 0)::int AS guest_count
FROM bookings b
WHERE b.booking_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
GROUP BY date_trunc('month', b.booking_date), EXTRACT(YEAR FROM b.booking_date), EXTRACT(MONTH FROM b.booking_date);

CREATE UNIQUE INDEX idx_mv_monthly_revenue_month ON mv_monthly_revenue(month);

CREATE MATERIALIZED VIEW mv_booking_pipeline AS
WITH status_counts AS (
  SELECT status, COUNT(*)::int AS count,
    COALESCE(AVG(invoice_total_usd), 0)::numeric(12,2) AS avg_value_usd
  FROM bookings GROUP BY status
), totals AS (
  SELECT SUM(count)::int AS total_in_pipeline,
    COALESCE(SUM(count) FILTER (WHERE status = 'completed'), 0)::int AS completed_count
  FROM status_counts
)
SELECT
  sc.status::text AS status,
  sc.count,
  CASE WHEN t.total_in_pipeline > 0 THEN ROUND(sc.count * 100.0 / t.total_in_pipeline, 2) ELSE 0 END::numeric(5,2) AS percentage_of_total,
  sc.avg_value_usd,
  t.total_in_pipeline,
  CASE WHEN t.total_in_pipeline > 0 THEN ROUND(t.completed_count * 100.0 / t.total_in_pipeline, 2) ELSE 0 END::numeric(5,2) AS conversion_rate
FROM status_counts sc CROSS JOIN totals t;

CREATE UNIQUE INDEX idx_mv_booking_pipeline_status ON mv_booking_pipeline(status);

CREATE VIEW booking_finance_report AS
SELECT
  b.id,
  b.booking_code,
  b.event_date,
  b.guest_name,
  b.room_number,
  p.name AS package_name,
  p.package_type,
  r.id AS resort_id,
  r.name AS resort_name,
  r.code AS resort_code,
  u.id AS staff_id,
  u.name AS staff_name,
  u.role AS staff_role,
  b.status,
  b.signed_by_guest,
  b.base_total_usd,
  b.service_charge_10_usd,
  b.gst_17_usd,
  b.invoice_total_usd,
  b.operation_share_50_usd,
  b.company_share_50_usd,
  b.staff_commission_5_usd,
  b.field_tip_incentive_usd,
  b.payout_status,
  fs.rating,
  fs.comment
FROM bookings b
JOIN packages p ON p.id = b.package_id
JOIN users u ON u.id = b.staff_id
LEFT JOIN resorts r ON r.id = b.resort_id
LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id;

CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW mv_dashboard_kpi;
  REFRESH MATERIALIZED VIEW mv_staff_performance;
  REFRESH MATERIALIZED VIEW mv_resort_analytics;
  REFRESH MATERIALIZED VIEW mv_monthly_revenue;
  REFRESH MATERIALIZED VIEW mv_booking_pipeline;
END;
$$ LANGUAGE plpgsql;

COMMIT;
