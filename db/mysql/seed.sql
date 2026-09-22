START TRANSACTION;

INSERT INTO access_permissions (permission_key, name, description, application, sort_order) VALUES
  ('admin.overview', 'Overview', 'View operational dashboard metrics and recent activity.', 'admin', 10),
  ('admin.bookings', 'Bookings', 'View and manage guest bookings and booking actions.', 'admin', 20),
  ('admin.resorts', 'Partner Resorts', 'View and manage partner resort records.', 'admin', 30),
  ('admin.finance', 'Finance', 'View finance reports, payouts, and reward settings.', 'admin', 40),
  ('admin.packages', 'Packages', 'View and manage experience packages and pricing.', 'admin', 50),
  ('admin.users', 'Users', 'View and manage administrator and staff accounts.', 'admin', 60),
  ('admin.roles', 'Roles', 'Manage roles, members, permission sets, and access reviews.', 'admin', 70),
  ('admin.logs', 'Logs', 'View security and operational audit logs.', 'admin', 80),
  ('admin.calendar', 'Calendar', 'View and manage resort calendar and sky events.', 'admin', 90),
  ('admin.notifications', 'Notifications', 'View and manage administrator notifications.', 'admin', 100),
  ('admin.settings', 'Settings', 'Manage Ephemeris application settings.', 'admin', 110),
  ('staff.bookings', 'Staff Bookings', 'View and manage bookings allowed by the staff portal.', 'staff', 120),
  ('staff.finance', 'Staff Finance', 'View commissions, rewards, and request payouts.', 'staff', 130),
  ('staff.sky_guide', 'Sky Guide', 'View and manage authorized resort sky events and settings.', 'staff', 140),
  ('staff.notifications', 'Staff Notifications', 'View and manage staff notifications.', 'staff', 150),
  ('staff.resort_profile', 'Public Resort Profile', 'Manage the assigned resort content displayed on the public landing page.', 'staff', 160)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  application = VALUES(application),
  sort_order = VALUES(sort_order);

INSERT INTO access_roles
  (slug, name, description, base_role, access_level, is_system, status, last_reviewed_at)
VALUES
  ('admin', 'Admin', 'Full administration access across Ephemeris.', 'admin', 'full', TRUE, 'active', NOW()),
  ('internal', 'Internal', 'Internal resort operations and Sky Guide management.', 'internal', 'scoped', TRUE, 'active', NOW()),
  ('external', 'External', 'External staff access scoped to their resort and own work.', 'external', 'scoped', TRUE, 'active', NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  base_role = VALUES(base_role),
  access_level = VALUES(access_level),
  is_system = TRUE,
  status = 'active';

INSERT IGNORE INTO access_role_permissions (access_role_id, permission_key)
SELECT role.id, permission.permission_key
FROM access_roles role
JOIN access_permissions permission ON
  (role.slug = 'admin' AND permission.application = 'admin')
  OR (role.slug = 'internal' AND permission.permission_key IN (
    'staff.bookings', 'staff.finance', 'staff.sky_guide', 'staff.notifications', 'staff.resort_profile'
  ))
  OR (role.slug = 'external' AND permission.permission_key IN (
    'staff.bookings', 'staff.finance', 'staff.sky_guide', 'staff.notifications'
  ));

INSERT INTO resorts
  (name, code, slug, location, timezone, contact_name, contact_phone, contact_email,
   whatsapp_number, status, observation_spots)
VALUES
  ('Le Meridien Maldives', 'LMM', 'le-meridien-maldives', 'Thilamaafushi, Maldives',
   'Indian/Maldives', 'Resort Concierge', '+960-000-0100',
   'concierge@lemeridien-maldives.example', '9600000100', 'active', '[]')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  slug = VALUES(slug),
  location = VALUES(location),
  timezone = VALUES(timezone),
  contact_name = VALUES(contact_name),
  contact_phone = VALUES(contact_phone),
  contact_email = VALUES(contact_email),
  whatsapp_number = VALUES(whatsapp_number),
  status = 'active';

INSERT INTO users
  (name, email, phone, role, resort_id, status, password_hash, access_role_id)
VALUES
  ('Admin Ephemeris', 'admin@ephemeris.id', '+960-000-0001', 'admin', NULL, 'active',
   'pbkdf2_sha256$310000$563ce7f90589ff4432d6bcf4c77e1532$d5a2b8639d71ed625c5ece39f87e44c3e054c7013d920122465cc69805aec300',
   (SELECT id FROM access_roles WHERE slug = 'admin')),
  ('Ahmad Fauzi', 'internal@ephemeris.id', '+960-000-0002', 'internal',
   (SELECT id FROM resorts WHERE code = 'LMM'), 'active',
   'pbkdf2_sha256$310000$d607f2060a4b572f437c2bd8ed7484a1$21eecf309fee3698a1f710faef7257ec705d1160fd91b37479b1b54f42328fa0',
   (SELECT id FROM access_roles WHERE slug = 'internal')),
  ('Budi Santoso', 'external@ephemeris.id', '+960-000-0003', 'external',
   (SELECT id FROM resorts WHERE code = 'LMM'), 'active',
   'pbkdf2_sha256$310000$b7a47773835dfd47a606d1ebf388f566$7bd015000025106c0dca5fe94a66dbdd42132943d9dad49585f62d68773f6051',
   (SELECT id FROM access_roles WHERE slug = 'external'))
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  phone = VALUES(phone),
  role = VALUES(role),
  resort_id = VALUES(resort_id),
  status = VALUES(status),
  password_hash = VALUES(password_hash),
  access_role_id = VALUES(access_role_id);

INSERT INTO packages
  (name, package_type, experience_type, location, schedule, resort_id, is_chargeable,
   adult_price_usd, child_price_usd, child_age_range, is_active)
VALUES
  ('Beach Stargazing', 'regular', 'communal', 'Palm Beach', 'Monday, Thursday & Saturday | 21:00 - 22:00', (SELECT id FROM resorts WHERE code = 'LMM'), TRUE, 90.00, 45.00, NULL, TRUE),
  ('Private Stargazing', 'private', 'private', 'Private Beach', 'Upon request | 21:00 - 22:00', (SELECT id FROM resorts WHERE code = 'LMM'), TRUE, 140.00, 70.00, NULL, TRUE),
  ('Kids Stargazing', 'kids', 'kids', 'Kids Club', 'Every Thursday | 19:30 - 20:30', (SELECT id FROM resorts WHERE code = 'LMM'), TRUE, 0.00, 45.00, '6 - 15 tahun', TRUE),
  ('Solar Observation', 'regular', 'communal', 'Waves Cafe', 'Every Tuesday & Saturday | 11:00 - 12:00', (SELECT id FROM resorts WHERE code = 'LMM'), FALSE, 0.00, 0.00, NULL, TRUE),
  ('Celestial Dining', 'private', 'private', 'Palm Beach', 'Upon request | 19:00 - 20:00', (SELECT id FROM resorts WHERE code = 'LMM'), TRUE, 185.00, 0.00, NULL, TRUE),
  ('Moon Observation', 'regular', 'communal', 'Remote Observatory', 'Upon request', (SELECT id FROM resorts WHERE code = 'LMM'), FALSE, 0.00, 0.00, NULL, TRUE),
  ('Night Sky', 'regular', 'communal', 'Remote Observatory', 'Upon request', (SELECT id FROM resorts WHERE code = 'LMM'), FALSE, 0.00, 0.00, NULL, TRUE),
  ('Deep Sky', 'regular', 'communal', 'Remote Observatory', 'Upon request', (SELECT id FROM resorts WHERE code = 'LMM'), FALSE, 0.00, 0.00, NULL, TRUE)
ON DUPLICATE KEY UPDATE
  package_type = VALUES(package_type),
  experience_type = VALUES(experience_type),
  location = VALUES(location),
  schedule = VALUES(schedule),
  is_chargeable = VALUES(is_chargeable),
  adult_price_usd = VALUES(adult_price_usd),
  child_price_usd = VALUES(child_price_usd),
  child_age_range = VALUES(child_age_range),
  is_active = VALUES(is_active);

INSERT IGNORE INTO bookings (
  booking_code, booking_date, event_date, time_start, time_end,
  guest_name, room_number, nationality, adult_count, child_count, child_ages,
  package_id, staff_id, resort_id, status, signed_by_guest, notes,
  base_total_usd, service_charge_10_usd, gst_17_usd, invoice_total_usd,
  operation_share_50_usd, company_share_50_usd, staff_commission_5_usd,
  field_tip_incentive_usd, payout_status, created_by
)
SELECT
  'LM-SKY-001', DATE('2026-08-01'), DATE('2026-08-08'), TIME('21:00'), TIME('22:00'),
  'Emma Collins', '214', 'United Kingdom', 2, 1, '9',
  beach_id, internal_id, resort_id, 'completed', TRUE, 'Guest requested WhatsApp feedback link after dinner.',
  225.00, 22.50, 38.25, 285.75, 112.50, 112.50, 5.63,
  20.00, 'commission_pending', admin_id
FROM (
  SELECT
    (SELECT id FROM users WHERE email = 'internal@ephemeris.id') AS internal_id,
    (SELECT id FROM users WHERE email = 'external@ephemeris.id') AS external_id,
    (SELECT id FROM users WHERE email = 'admin@ephemeris.id') AS admin_id,
    (SELECT id FROM resorts WHERE code = 'LMM') AS resort_id,
    (SELECT id FROM packages WHERE name = 'Beach Stargazing' LIMIT 1) AS beach_id,
    (SELECT id FROM packages WHERE name = 'Private Stargazing' LIMIT 1) AS private_id,
    (SELECT id FROM packages WHERE name = 'Kids Stargazing' LIMIT 1) AS kids_id
) refs
UNION ALL
SELECT
  'LM-SKY-002', DATE('2026-08-02'), DATE('2026-08-09'), TIME('21:30'), TIME('22:45'),
  'Michael Tan', '108', 'Singapore', 2, 0, NULL,
  private_id, external_id, resort_id, 'active', FALSE, 'Anniversary setup.',
  280.00, 28.00, 47.60, 355.60, 140.00, 140.00, 7.00,
  0.00, 'commission_pending', external_id
FROM (
  SELECT
    (SELECT id FROM users WHERE email = 'external@ephemeris.id') AS external_id,
    (SELECT id FROM resorts WHERE code = 'LMM') AS resort_id,
    (SELECT id FROM packages WHERE name = 'Private Stargazing' LIMIT 1) AS private_id
) refs
UNION ALL
SELECT
  'LM-SKY-003', DATE('2026-08-03'), DATE('2026-08-10'), TIME('19:30'), TIME('20:15'),
  'Aisha Al Mansoori', '302', 'United Arab Emirates', 0, 3, '6, 8, 10',
  kids_id, internal_id, resort_id, 'completed', TRUE, 'Parents will sign manual invoice at reception.',
  135.00, 13.50, 22.95, 171.45, 67.50, 67.50, 3.38,
  15.00, 'commission_pending', admin_id
FROM (
  SELECT
    (SELECT id FROM users WHERE email = 'internal@ephemeris.id') AS internal_id,
    (SELECT id FROM users WHERE email = 'admin@ephemeris.id') AS admin_id,
    (SELECT id FROM resorts WHERE code = 'LMM') AS resort_id,
    (SELECT id FROM packages WHERE name = 'Kids Stargazing' LIMIT 1) AS kids_id
) refs;

INSERT IGNORE INTO feedback_tokens (booking_id, token, status, sent_at, submitted_at)
SELECT id, 'fb-lm-sky-001', 'submitted', NOW(), NOW()
FROM bookings WHERE booking_code = 'LM-SKY-001';

INSERT IGNORE INTO feedback_tokens (booking_id, token, status)
SELECT id, 'fb-lm-sky-002', 'not_sent'
FROM bookings WHERE booking_code = 'LM-SKY-002';

INSERT IGNORE INTO feedback_submissions (booking_id, token_id, rating, comment)
SELECT booking.id, token.id, 5, 'Beautiful session and very friendly astronomer.'
FROM bookings booking
JOIN feedback_tokens token ON token.booking_id = booking.id
WHERE booking.booking_code = 'LM-SKY-001';

COMMIT;
