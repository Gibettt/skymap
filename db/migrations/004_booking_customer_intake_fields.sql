ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_phone text,
  ADD COLUMN IF NOT EXISTS seating_setup text,
  ADD COLUMN IF NOT EXISTS photo_request text,
  ADD COLUMN IF NOT EXISTS privacy_preference text,
  ADD COLUMN IF NOT EXISTS dietary_restrictions text,
  ADD COLUMN IF NOT EXISTS reschedule_consent text,
  ADD COLUMN IF NOT EXISTS slot_status text NOT NULL DEFAULT 'available';
