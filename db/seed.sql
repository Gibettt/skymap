BEGIN;

INSERT INTO resorts (name, code, location, timezone, contact_name, contact_phone, status)
VALUES
  ('Le Meridien Maldives', 'LMM', 'Thilamaafushi, Maldives', 'Indian/Maldives', 'Resort Concierge', '+960-000-0100', 'active')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  timezone = EXCLUDED.timezone,
  contact_name = EXCLUDED.contact_name,
  contact_phone = EXCLUDED.contact_phone,
  status = EXCLUDED.status;

INSERT INTO users (name, email, phone, role, resort_id, status, password_hash)
VALUES
  ('Admin Ephemeris', 'admin@ephemeris.id', '+960-000-0001', 'admin', NULL, 'active', 'pbkdf2_sha256$310000$563ce7f90589ff4432d6bcf4c77e1532$d5a2b8639d71ed625c5ece39f87e44c3e054c7013d920122465cc69805aec300'),
  ('Ahmad Fauzi', 'internal@ephemeris.id', '+960-000-0002', 'internal', NULL, 'active', 'pbkdf2_sha256$310000$d607f2060a4b572f437c2bd8ed7484a1$21eecf309fee3698a1f710faef7257ec705d1160fd91b37479b1b54f42328fa0'),
  ('Budi Santoso', 'external@ephemeris.id', '+960-000-0003', 'external', (SELECT id FROM resorts WHERE code = 'LMM'), 'active', 'pbkdf2_sha256$310000$b7a47773835dfd47a606d1ebf388f566$7bd015000025106c0dca5fe94a66dbdd42132943d9dad49585f62d68773f6051')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role,
  resort_id = EXCLUDED.resort_id,
  status = EXCLUDED.status,
  password_hash = EXCLUDED.password_hash;

INSERT INTO packages (name, package_type, experience_type, location, adult_price_usd, child_price_usd, child_age_range, is_active)
VALUES
  ('Beach Stargazing', 'regular', 'communal', 'Palm Beach', 90.00, 45.00, NULL, true),
  ('Private Stargazing', 'private', 'private', 'Private Beach', 140.00, 70.00, NULL, true),
  ('Kids Stargazing', 'kids', 'kids', 'Kids Club', 0.00, 45.00, '6 - 15 tahun', true),
  ('Solar Observation', 'regular', 'communal', 'Waves Cafe', 55.00, 27.50, NULL, true),
  ('Celestial Dining', 'private', 'private', 'Palm Beach', 185.00, 0.00, NULL, true),
  ('Moon Observation', 'regular', 'communal', 'Remote Observatory', 0.00, 0.00, NULL, true),
  ('Night Sky', 'regular', 'communal', 'Remote Observatory', 0.00, 0.00, NULL, true),
  ('Deep Sky', 'regular', 'communal', 'Remote Observatory', 0.00, 0.00, NULL, true)
ON CONFLICT (name) DO UPDATE SET
  package_type = EXCLUDED.package_type,
  experience_type = EXCLUDED.experience_type,
  location = EXCLUDED.location,
  adult_price_usd = EXCLUDED.adult_price_usd,
  child_price_usd = EXCLUDED.child_price_usd,
  child_age_range = EXCLUDED.child_age_range,
  is_active = EXCLUDED.is_active;

WITH refs AS (
  SELECT
    (SELECT id FROM users WHERE email = 'internal@ephemeris.id') AS internal_id,
    (SELECT id FROM users WHERE email = 'external@ephemeris.id') AS external_id,
    (SELECT id FROM users WHERE email = 'admin@ephemeris.id') AS admin_id,
    (SELECT id FROM resorts WHERE code = 'LMM') AS resort_id,
    (SELECT id FROM packages WHERE name = 'Beach Stargazing') AS beach_id,
    (SELECT id FROM packages WHERE name = 'Private Stargazing') AS private_id,
    (SELECT id FROM packages WHERE name = 'Kids Stargazing') AS kids_id
)
INSERT INTO bookings (
  booking_code, booking_date, event_date, time_start, time_end,
  guest_name, room_number, nationality, adult_count, child_count, child_ages,
  package_id, staff_id, resort_id, status, signed_by_guest, notes,
  base_total_usd, service_charge_10_usd, gst_17_usd, invoice_total_usd,
  operation_share_50_usd, company_share_50_usd, staff_commission_5_usd,
  field_tip_incentive_usd, payout_status, created_by
)
SELECT * FROM (
  SELECT
    'LM-SKY-001', DATE '2026-08-01', DATE '2026-08-08', TIME '21:00', TIME '22:00',
    'Emma Collins', '214', 'United Kingdom', 2, 1, '9',
    beach_id, internal_id, NULL, 'finished_experience'::booking_status, true, 'Guest requested WhatsApp feedback link after dinner.',
    225.00, 22.50, 38.25, 285.75, 112.50, 112.50, 5.63,
    20.00, 'commission_pending'::payout_status, admin_id
  FROM refs
  UNION ALL
  SELECT
    'LM-SKY-002', DATE '2026-08-02', DATE '2026-08-09', TIME '21:30', TIME '22:45',
    'Michael Tan', '108', 'Singapore', 2, 0, NULL,
    private_id, external_id, resort_id, 'booked'::booking_status, false, 'Anniversary setup.',
    280.00, 28.00, 47.60, 355.60, 140.00, 140.00, 7.00,
    0.00, 'commission_pending'::payout_status, external_id
  FROM refs
  UNION ALL
  SELECT
    'LM-SKY-003', DATE '2026-08-03', DATE '2026-08-10', TIME '19:30', TIME '20:15',
    'Aisha Al Mansoori', '302', 'United Arab Emirates', 0, 3, '6, 8, 10',
    kids_id, internal_id, NULL, 'finished_experience'::booking_status, true, 'Parents will sign manual invoice at reception.',
    135.00, 13.50, 22.95, 171.45, 67.50, 67.50, 3.38,
    15.00, 'commission_pending'::payout_status, admin_id
  FROM refs
) AS rows
ON CONFLICT (booking_code) DO NOTHING;

INSERT INTO feedback_tokens (booking_id, token, status, sent_at, submitted_at)
SELECT b.id, 'fb-lm-sky-001', 'submitted', now(), now()
FROM bookings b
WHERE b.booking_code = 'LM-SKY-001'
ON CONFLICT (booking_id) DO NOTHING;

INSERT INTO feedback_tokens (booking_id, token, status)
SELECT b.id, 'fb-lm-sky-002', 'not_sent'
FROM bookings b
WHERE b.booking_code = 'LM-SKY-002'
ON CONFLICT (booking_id) DO NOTHING;

INSERT INTO feedback_submissions (booking_id, token_id, rating, comment)
SELECT b.id, ft.id, 5, 'Beautiful session and very friendly astronomer.'
FROM bookings b
JOIN feedback_tokens ft ON ft.booking_id = b.id
WHERE b.booking_code = 'LM-SKY-001'
ON CONFLICT (booking_id) DO NOTHING;

COMMIT;
