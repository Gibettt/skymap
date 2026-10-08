BEGIN;

CREATE TABLE IF NOT EXISTS package_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL,
  slug varchar(80) NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO package_types (name, slug) VALUES
  ('Regular', 'regular'),
  ('Private', 'private'),
  ('Kids', 'kids')
ON CONFLICT (slug) DO NOTHING;

DROP VIEW IF EXISTS booking_finance_report;
ALTER TABLE packages ALTER COLUMN package_type TYPE varchar(80);

CREATE OR REPLACE VIEW booking_finance_report AS
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

COMMIT;
