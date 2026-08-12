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
  CREATE TYPE booking_status AS ENUM ('pending_review', 'accepted', 'rejected', 'booked', 'finished_experience', 'cancelled');
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
  contact_name text,
  contact_phone text,
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  package_type package_type NOT NULL,
  experience_type experience_type NOT NULL,
  location text NOT NULL,
  adult_price_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (adult_price_usd >= 0),
  child_price_usd numeric(10,2) CHECK (child_price_usd IS NULL OR child_price_usd >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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
  seating_setup text,
  photo_request text,
  privacy_preference text,
  dietary_restrictions text,
  reschedule_consent text,
  slot_status text NOT NULL DEFAULT 'available',
  booking_source text,
  package_id uuid NOT NULL REFERENCES packages(id),
  add_ons jsonb NOT NULL DEFAULT '[]'::jsonb,
  package_notes text,
  staff_id uuid NOT NULL REFERENCES users(id),
  resort_id uuid REFERENCES resorts(id),
  status booking_status NOT NULL DEFAULT 'booked',
  signed_by_guest boolean NOT NULL DEFAULT false,
  notes text,
  payment_method text,
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
  CHECK (adult_count + child_count > 0)
);

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

CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id),
  resort_id uuid REFERENCES resorts(id),
  amount_usd numeric(10,2) NOT NULL CHECK (amount_usd > 0),
  commission_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (commission_usd >= 0),
  star_bonus_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (star_bonus_usd >= 0),
  star_points numeric(10,2) NOT NULL DEFAULT 0 CHECK (star_points >= 0),
  full_stars integer NOT NULL DEFAULT 0 CHECK (full_stars BETWEEN 0 AND 5),
  payment_method text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  notes text,
  admin_notes text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'paid', 'rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
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

DROP TRIGGER IF EXISTS packages_set_updated_at ON packages;
CREATE TRIGGER packages_set_updated_at
BEFORE UPDATE ON packages
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

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_resort_id ON users(resort_id);
CREATE INDEX IF NOT EXISTS idx_packages_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resort_id ON bookings(resort_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON bookings(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_source ON bookings(booking_source);
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_token ON feedback_tokens(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_requester ON payout_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

CREATE TABLE IF NOT EXISTS sky_app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  name text NOT NULL,
  latitude numeric(8,5) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(8,5) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  timezone text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
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
  is_published boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);

DROP TRIGGER IF EXISTS sky_app_settings_set_updated_at ON sky_app_settings;
CREATE TRIGGER sky_app_settings_set_updated_at BEFORE UPDATE ON sky_app_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS sky_events_set_updated_at ON sky_events;
CREATE TRIGGER sky_events_set_updated_at BEFORE UPDATE ON sky_events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX IF NOT EXISTS idx_sky_events_public_starts ON sky_events(is_published, starts_at);

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
