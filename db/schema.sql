BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'internal', 'external');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE package_type AS ENUM ('regular', 'private', 'kids');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE experience_type AS ENUM ('communal', 'private', 'kids');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending', 'active', 'completed', 'rejected', 'cancelled_by_guest', 'cancelled_weather', 'rescheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM ('not_sent', 'sent', 'submitted', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payout_status AS ENUM ('commission_pending', 'commission_approved', 'commission_paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS resorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  location text,
  timezone text NOT NULL DEFAULT 'Indian/Maldives',
  latitude numeric(9,6) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  observation_spots text NOT NULL DEFAULT '',
  contact_name text,
  contact_phone text,
  contact_email varchar(254),
  whatsapp_number varchar(32),
  slug varchar(120) UNIQUE,
  status user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role user_role NOT NULL,
  resort_id uuid REFERENCES resorts(id),
  status user_status NOT NULL DEFAULT 'active',
  password_hash text NOT NULL,
  last_seen_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS access_permissions (
  permission_key varchar(80) PRIMARY KEY,
  name varchar(120) NOT NULL,
  description varchar(240) NOT NULL DEFAULT '',
  application varchar(40) NOT NULL CHECK (application IN ('admin', 'staff')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0)
);

CREATE TABLE IF NOT EXISTS access_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(80) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  description varchar(240) NOT NULL DEFAULT '',
  base_role user_role NOT NULL,
  access_level varchar(20) NOT NULL DEFAULT 'scoped'
    CHECK (access_level IN ('full', 'scoped', 'read_only')),
  is_system boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  permissions_updated_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_roles_name_ci
  ON access_roles (lower(name));

CREATE TABLE IF NOT EXISTS access_role_permissions (
  access_role_id uuid NOT NULL REFERENCES access_roles(id) ON DELETE CASCADE,
  permission_key varchar(80) NOT NULL REFERENCES access_permissions(permission_key) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (access_role_id, permission_key)
);

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
  ('staff.notifications', 'Staff Notifications', 'View and manage staff notifications.', 'staff', 150)
ON CONFLICT (permission_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  application = EXCLUDED.application,
  sort_order = EXCLUDED.sort_order;

INSERT INTO access_roles
  (slug, name, description, base_role, access_level, is_system, status, last_reviewed_at)
VALUES
  ('admin', 'Admin', 'Full administration access across Ephemeris.', 'admin', 'full', true, 'active', now()),
  ('internal', 'Internal', 'Internal resort operations and Sky Guide management.', 'internal', 'scoped', true, 'active', now()),
  ('external', 'External', 'External staff access scoped to their resort and own work.', 'external', 'scoped', true, 'active', now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_role = EXCLUDED.base_role,
  access_level = EXCLUDED.access_level,
  is_system = true,
  status = 'active';

INSERT INTO access_role_permissions (access_role_id, permission_key)
SELECT role.id, permission.permission_key
FROM access_roles role
JOIN access_permissions permission ON
  (role.slug = 'admin' AND permission.application = 'admin')
  OR (role.slug = 'internal' AND permission.permission_key IN (
    'staff.bookings', 'staff.finance', 'staff.sky_guide', 'staff.notifications'
  ))
  OR (role.slug = 'external' AND permission.permission_key IN (
    'staff.bookings', 'staff.finance', 'staff.sky_guide', 'staff.notifications'
  ))
ON CONFLICT (access_role_id, permission_key) DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_role_id uuid REFERENCES access_roles(id) ON DELETE RESTRICT;

UPDATE users user_record
SET access_role_id = role.id
FROM access_roles role
WHERE user_record.access_role_id IS NULL
  AND role.is_system
  AND role.base_role = user_record.role;

ALTER TABLE users ALTER COLUMN access_role_id SET NOT NULL;

CREATE OR REPLACE FUNCTION assign_compatible_access_role()
RETURNS trigger AS $$
DECLARE
  assigned_base_role user_role;
BEGIN
  IF NEW.access_role_id IS NOT NULL THEN
    SELECT base_role INTO assigned_base_role
    FROM access_roles
    WHERE id = NEW.access_role_id AND status = 'active';
  END IF;

  IF assigned_base_role IS NULL OR assigned_base_role <> NEW.role THEN
    SELECT id INTO NEW.access_role_id
    FROM access_roles
    WHERE is_system AND status = 'active' AND base_role = NEW.role
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF NEW.access_role_id IS NULL THEN
    RAISE EXCEPTION 'No active access role is available for base role %', NEW.role
      USING ERRCODE = '23514', CONSTRAINT = 'users_access_role_required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_assign_compatible_access_role ON users;
CREATE TRIGGER users_assign_compatible_access_role
BEFORE INSERT OR UPDATE OF role, access_role_id ON users
FOR EACH ROW EXECUTE FUNCTION assign_compatible_access_role();

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  package_type package_type NOT NULL,
  experience_type experience_type NOT NULL,
  location text NOT NULL,
  description text,
  schedule text NOT NULL DEFAULT 'Upon request' CHECK (char_length(btrim(schedule)) BETWEEN 1 AND 120),
  resort_id uuid REFERENCES resorts(id),
  is_chargeable boolean NOT NULL DEFAULT true,
  image_data bytea,
  image_mime_type text CHECK (image_mime_type IS NULL OR image_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  image_file_name text,
  adult_price_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (adult_price_usd >= 0),
  child_price_usd numeric(10,2) CHECK (child_price_usd IS NULL OR child_price_usd >= 0),
  child_age_range text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (image_data IS NULL OR octet_length(image_data) <= 2097152)
);

CREATE TABLE IF NOT EXISTS package_inclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  label varchar(120) NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, sort_order)
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text NOT NULL UNIQUE,
  booking_date date NOT NULL DEFAULT current_date,
  event_date date NOT NULL,
  time_start time NOT NULL,
  time_end time NOT NULL,
  guest_name text NOT NULL,
  guest_phone text,
  guest_email text,
  preferred_language text,
  room_number text NOT NULL,
  nationality text NOT NULL,
  adult_count integer NOT NULL DEFAULT 0 CHECK (adult_count >= 0),
  child_count integer NOT NULL DEFAULT 0 CHECK (child_count >= 0),
  child_ages text,
  special_occasion text,
  guardian_name text,
  guardian_phone text,
  privacy_preference text,
  dietary_restrictions text,
  reschedule_consent text,
  slot_status text NOT NULL DEFAULT 'available',
  booking_source text,
  package_id uuid NOT NULL REFERENCES packages(id),
  booked_adult_price_usd numeric(10,2) NOT NULL DEFAULT 0,
  booked_child_price_usd numeric(10,2) NOT NULL DEFAULT 0,
  add_ons jsonb NOT NULL DEFAULT '[]'::jsonb,
  package_notes text,
  staff_id uuid NOT NULL REFERENCES users(id),
  assigned_internal_id uuid REFERENCES users(id),
  resort_id uuid REFERENCES resorts(id),
  status booking_status NOT NULL DEFAULT 'pending',
  signed_by_guest boolean NOT NULL DEFAULT false,
  notes text,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  payment_confirmed_at timestamptz,
  payment_confirmed_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  payment_reference varchar(120),
  payment_notes text,
  invoice_number text,
  billing_notes text,
  weather_condition text,
  equipment_needed text,
  assigned_astronomer text,
  assigned_butler text,
  setup_status text NOT NULL DEFAULT 'not_started',
  base_total_usd numeric(10,2) NOT NULL DEFAULT 0,
  service_charge_10_usd numeric(10,2) NOT NULL DEFAULT 0,
  gst_17_usd numeric(10,2) NOT NULL DEFAULT 0,
  invoice_total_usd numeric(10,2) NOT NULL DEFAULT 0,
  operation_share_50_usd numeric(10,2) NOT NULL DEFAULT 0,
  company_share_50_usd numeric(10,2) NOT NULL DEFAULT 0,
  staff_commission_5_usd numeric(10,2) NOT NULL DEFAULT 0,
  field_tip_incentive_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (field_tip_incentive_usd >= 0),
  tip_recipient text,
  tip_notes text,
  payout_status payout_status NOT NULL DEFAULT 'commission_pending',
  currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (adult_count + child_count > 0),
  CHECK (
    (payment_status = 'pending' AND payment_confirmed_at IS NULL AND payment_confirmed_by IS NULL)
    OR
    (payment_status = 'paid' AND payment_confirmed_at IS NOT NULL AND payment_confirmed_by IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON bookings(payment_status, created_at DESC);

CREATE TABLE IF NOT EXISTS booking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  participant_type text NOT NULL CHECK (participant_type IN ('adult', 'child')),
  full_name varchar(200) NOT NULL,
  age integer CHECK (age IS NULL OR age BETWEEN 0 AND 120),
  nationality varchar(80) NOT NULL,
  notes varchar(500),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_booking_participants_booking
  ON booking_participants(booking_id, sort_order);

CREATE TABLE IF NOT EXISTS booking_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES packages(id),
  sky_event_id uuid REFERENCES sky_events(id) ON DELETE SET NULL,
  event_date date NOT NULL,
  time_start time NOT NULL,
  time_end time NOT NULL,
  observation_spot varchar(120),
  booked_adult_price_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (booked_adult_price_usd >= 0),
  booked_child_price_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (booked_child_price_usd >= 0),
  base_total_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (base_total_usd >= 0),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, sort_order),
  CHECK (time_end > time_start)
);

CREATE INDEX IF NOT EXISTS idx_booking_experiences_booking
  ON booking_experiences(booking_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_booking_experiences_package
  ON booking_experiences(package_id);

CREATE TABLE IF NOT EXISTS feedback_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status feedback_status NOT NULL DEFAULT 'not_sent',
  sent_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  token_id uuid NOT NULL UNIQUE REFERENCES feedback_tokens(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_login (
  email text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limit_registration (
  scope varchar(32) NOT NULL,
  key_hash char(64) NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (scope, key_hash)
);

CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id),
  resort_id uuid REFERENCES resorts(id),
  amount_usd numeric(10,2) NOT NULL CHECK (amount_usd > 0),
  commission_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (commission_usd >= 0),
  star_bonus_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (star_bonus_usd >= 0),
  star_points numeric(10,2) NOT NULL DEFAULT 0 CHECK (star_points >= 0),
  full_stars integer NOT NULL DEFAULT 0 CHECK (full_stars BETWEEN 0 AND 5),
  bank_name varchar(120) NOT NULL,
  account_holder_name varchar(120) NOT NULL,
  account_number text NOT NULL,
  notes text,
  admin_notes text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processed', 'completed', 'rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number varchar(48) NOT NULL UNIQUE,
  invoice_type text NOT NULL CHECK (invoice_type IN ('customer', 'staff_payout')),
  status text NOT NULL CHECK (status IN ('issued', 'paid')),
  booking_id uuid UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  payout_request_id uuid UNIQUE REFERENCES payout_requests(id) ON DELETE RESTRICT,
  recipient_name varchar(200) NOT NULL,
  recipient_email varchar(320),
  recipient_phone varchar(80),
  recipient_detail text,
  payment_method text,
  currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  subtotal_usd numeric(12,2) NOT NULL CHECK (subtotal_usd >= 0),
  service_charge_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (service_charge_usd >= 0),
  tax_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_usd >= 0),
  total_usd numeric(12,2) NOT NULL CHECK (total_usd > 0),
  line_items jsonb NOT NULL CHECK (jsonb_typeof(line_items) = 'array'),
  source_snapshot jsonb NOT NULL CHECK (jsonb_typeof(source_snapshot) = 'object'),
  notes text,
  issued_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (invoice_type = 'customer' AND status = 'issued' AND booking_id IS NOT NULL AND payout_request_id IS NULL)
    OR
    (invoice_type = 'staff_payout' AND status = 'paid' AND booking_id IS NULL AND payout_request_id IS NOT NULL)
  ),
  CHECK (due_date IS NULL OR due_date >= issued_at::date),
  CHECK (total_usd = subtotal_usd + service_charge_usd + tax_usd)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking', 'payout')),
  source_table text NOT NULL CHECK (source_table IN ('bookings', 'payout_requests')),
  source_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  meta text,
  link text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_user_id, type, source_id)
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS access_roles_set_updated_at ON access_roles;
CREATE TRIGGER access_roles_set_updated_at
BEFORE UPDATE ON access_roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS packages_set_updated_at ON packages;
CREATE TRIGGER packages_set_updated_at
BEFORE UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS package_inclusions_set_updated_at ON package_inclusions;
CREATE TRIGGER package_inclusions_set_updated_at
BEFORE UPDATE ON package_inclusions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS resorts_set_updated_at ON resorts;
CREATE TRIGGER resorts_set_updated_at
BEFORE UPDATE ON resorts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS bookings_set_updated_at ON bookings;
CREATE TRIGGER bookings_set_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS payout_requests_set_updated_at ON payout_requests;
CREATE TRIGGER payout_requests_set_updated_at
BEFORE UPDATE ON payout_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS invoices_set_updated_at ON invoices;
CREATE TRIGGER invoices_set_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS notifications_set_updated_at ON notifications;
CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_resort_id ON users(resort_id);
CREATE INDEX IF NOT EXISTS idx_users_access_role_id ON users(access_role_id);
CREATE INDEX IF NOT EXISTS idx_access_roles_base_status ON access_roles(base_role, status);
CREATE INDEX IF NOT EXISTS idx_access_role_permissions_permission
  ON access_role_permissions(permission_key, access_role_id);
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_package_inclusions_package_active
  ON package_inclusions(package_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resort_id ON bookings(resort_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON bookings(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_source ON bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_token ON feedback_tokens(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_login_email_time ON rate_limit_login(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_registration_window
  ON rate_limit_registration(window_started_at);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requester ON payout_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_invoices_type_issued ON invoices(invoice_type, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_recipient ON invoices(recipient_name);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_by ON invoices(issued_by, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(type, source_id);

CREATE TABLE IF NOT EXISTS sky_app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  name text NOT NULL,
  latitude numeric(8,5) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(8,5) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  timezone text NOT NULL,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sky_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  star_adult_unit numeric(8,2) NOT NULL DEFAULT 1 CHECK (star_adult_unit >= 0),
  star_child_unit numeric(8,2) NOT NULL DEFAULT 0.5 CHECK (star_child_unit >= 0),
  star_threshold numeric(8,2) NOT NULL DEFAULT 10 CHECK (star_threshold > 0),
  star_bonus_usd numeric(10,2) NOT NULL DEFAULT 10.00 CHECK (star_bonus_usd >= 0),
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO sky_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

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

CREATE TABLE IF NOT EXISTS sky_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) <= 120),
  event_type text NOT NULL CHECK (event_type IN ('astronomy', 'meteor', 'resort')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  description text NOT NULL DEFAULT '',
  source_name text,
  source_url text,
  visibility text NOT NULL DEFAULT 'both' CHECK (visibility IN ('north', 'south', 'both')),
  resort_id uuid NOT NULL REFERENCES resorts(id),
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  observation_spot varchar(120),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  price_override_usd numeric(10,2) CHECK (price_override_usd IS NULL OR price_override_usd >= 0),
  image_url varchar(500),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'sold_out')),
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE OR REPLACE FUNCTION enforce_internal_sky_manager()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.updated_by AND role IN ('admin', 'internal') AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Sky Guide can only be managed by an active admin or internal staff member';
  END IF;
  IF TG_TABLE_NAME = 'sky_events' AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.updated_by
      AND status = 'active'
      AND (role = 'admin' OR (role = 'internal' AND resort_id = NEW.resort_id))
  ) THEN
    RAISE EXCEPTION 'Internal staff can only manage Sky Guide for their assigned resort';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sky_app_settings_set_updated_at ON sky_app_settings;
CREATE TRIGGER sky_app_settings_set_updated_at BEFORE UPDATE ON sky_app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS sky_app_settings_internal_manager ON sky_app_settings;
CREATE TRIGGER sky_app_settings_internal_manager BEFORE INSERT OR UPDATE ON sky_app_settings FOR EACH ROW EXECUTE FUNCTION enforce_internal_sky_manager();
DROP TRIGGER IF EXISTS sky_events_set_updated_at ON sky_events;
CREATE TRIGGER sky_events_set_updated_at BEFORE UPDATE ON sky_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS sky_events_internal_manager ON sky_events;
CREATE TRIGGER sky_events_internal_manager BEFORE INSERT OR UPDATE ON sky_events FOR EACH ROW EXECUTE FUNCTION enforce_internal_sky_manager();
CREATE INDEX IF NOT EXISTS idx_sky_events_public_starts ON sky_events(is_published, starts_at);
CREATE INDEX IF NOT EXISTS idx_sky_events_resort_status_starts ON sky_events(resort_id, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_packages_resort_active ON packages(resort_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_packages_resort_name ON packages(resort_id, name);
CREATE INDEX IF NOT EXISTS idx_booking_reschedule_history_booking ON booking_reschedule_history(booking_id, created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sky_event_id uuid REFERENCES sky_events(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS observation_spot varchar(120);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_internal ON bookings(assigned_internal_id, event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_sky_event ON bookings(sky_event_id);

CREATE OR REPLACE VIEW resort_staff_coverage AS
SELECT
  r.id AS resort_id,
  r.name AS resort_name,
  r.status AS resort_status,
  COALESCE(staff.active_internal_count, 0)::int AS active_internal_count,
  COALESCE(staff.active_external_count, 0)::int AS active_external_count,
  COALESCE(bookings.open_bookings_count, 0)::int AS open_bookings_count,
  CASE
    WHEN r.status <> 'active' THEN 'inactive'
    WHEN COALESCE(staff.active_internal_count, 0) > 0
      AND COALESCE(staff.active_external_count, 0) > 0 THEN 'ready'
    WHEN COALESCE(staff.active_internal_count, 0) = 0
      AND COALESCE(staff.active_external_count, 0) = 0 THEN 'needs_both'
    WHEN COALESCE(staff.active_internal_count, 0) = 0 THEN 'needs_internal'
    ELSE 'needs_external'
  END AS coverage_status
FROM resorts r
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE role = 'internal' AND status = 'active') AS active_internal_count,
    COUNT(*) FILTER (WHERE role = 'external' AND status = 'active') AS active_external_count
  FROM users
  WHERE resort_id = r.id
) staff ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS open_bookings_count
  FROM bookings
  WHERE resort_id = r.id AND status IN ('pending', 'active', 'rescheduled')
) bookings ON true;

CREATE OR REPLACE FUNCTION enforce_resort_operational_transition()
RETURNS trigger AS $$
DECLARE
  internal_count integer;
  external_count integer;
  open_count integer;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT
      COUNT(*) FILTER (WHERE role = 'internal' AND status = 'active'),
      COUNT(*) FILTER (WHERE role = 'external' AND status = 'active')
    INTO internal_count, external_count
    FROM users
    WHERE resort_id = NEW.id;
    IF internal_count = 0 OR external_count = 0 THEN
      RAISE EXCEPTION 'Active resort requires Internal and External staff coverage'
        USING ERRCODE = '23514', CONSTRAINT = 'resort_staff_coverage_required';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'inactive' THEN
    SELECT COUNT(*) INTO open_count
    FROM bookings
    WHERE resort_id = NEW.id AND status IN ('pending', 'active', 'rescheduled');
    IF open_count > 0 THEN
      RAISE EXCEPTION 'Resort with open bookings cannot be deactivated'
        USING ERRCODE = '23514', CONSTRAINT = 'resort_open_bookings_block_deactivation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS resorts_operational_transition ON resorts;
CREATE TRIGGER resorts_operational_transition
BEFORE INSERT OR UPDATE OF status ON resorts
FOR EACH ROW EXECUTE FUNCTION enforce_resort_operational_transition();

CREATE OR REPLACE FUNCTION enforce_last_resort_staff_coverage()
RETURNS trigger AS $$
DECLARE
  replacement_count integer;
  open_count integer;
  keeps_coverage boolean;
BEGIN
  IF OLD.resort_id IS NULL OR OLD.status <> 'active' OR OLD.role NOT IN ('internal', 'external') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  keeps_coverage := TG_OP <> 'DELETE'
    AND NEW.status = 'active'
    AND NEW.role = OLD.role
    AND NEW.resort_id = OLD.resort_id;
  IF keeps_coverage THEN RETURN NEW; END IF;

  PERFORM id FROM resorts WHERE id = OLD.resort_id FOR UPDATE;
  SELECT COUNT(*) INTO replacement_count
  FROM users
  WHERE resort_id = OLD.resort_id AND role = OLD.role AND status = 'active' AND id <> OLD.id;
  SELECT COUNT(*) INTO open_count
  FROM bookings
  WHERE resort_id = OLD.resort_id AND status IN ('pending', 'active', 'rescheduled');
  IF replacement_count = 0 AND open_count > 0 THEN
    RAISE EXCEPTION 'Last covered staff cannot leave a resort with open bookings'
      USING ERRCODE = '23514', CONSTRAINT = 'last_resort_staff_with_open_bookings';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_last_resort_staff_coverage ON users;
CREATE TRIGGER users_last_resort_staff_coverage
BEFORE UPDATE OF role, status, resort_id OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION enforce_last_resort_staff_coverage();

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
