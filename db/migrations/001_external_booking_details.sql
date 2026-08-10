BEGIN;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS preferred_language text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_occasion text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS add_ons jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_notes text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_number text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS billing_notes text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS weather_condition text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS equipment_needed text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_astronomer text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_butler text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS setup_status text NOT NULL DEFAULT 'not_started';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_recipient text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_notes text;

CREATE INDEX IF NOT EXISTS idx_bookings_guest_phone ON bookings(guest_phone);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_source ON bookings(booking_source);

COMMIT;
