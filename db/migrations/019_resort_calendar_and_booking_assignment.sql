BEGIN;

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE resorts ADD COLUMN IF NOT EXISTS latitude numeric(9,6);
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS longitude numeric(9,6);
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS observation_spots text NOT NULL DEFAULT '';

ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS resort_id uuid REFERENCES resorts(id);
ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL;
ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS observation_spot varchar(120);
ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS capacity integer CHECK (capacity IS NULL OR capacity > 0);
ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS price_override_usd numeric(10,2) CHECK (price_override_usd IS NULL OR price_override_usd >= 0);
ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS image_url varchar(500);
ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

DROP TRIGGER IF EXISTS sky_events_internal_manager ON sky_events;

UPDATE sky_events se
SET resort_id = COALESCE(
  (SELECT u.resort_id FROM users u WHERE u.id = COALESCE(se.updated_by, se.created_by)),
  (SELECT r.id FROM resorts r ORDER BY (r.status = 'active') DESC, r.created_at ASC LIMIT 1)
)
WHERE se.resort_id IS NULL;

UPDATE sky_events SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;

DO $$ BEGIN
  ALTER TABLE sky_events ADD CONSTRAINT sky_events_status_check
    CHECK (status IN ('draft', 'published', 'cancelled', 'sold_out'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM sky_events WHERE resort_id IS NULL) THEN
    ALTER TABLE sky_events ALTER COLUMN resort_id SET NOT NULL;
  END IF;
END $$;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS assigned_internal_id uuid REFERENCES users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sky_event_id uuid REFERENCES sky_events(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS observation_spot varchar(120);
ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'pending';

CREATE OR REPLACE FUNCTION enforce_internal_sky_manager()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.updated_by AND role = 'internal' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Sky Guide can only be managed by active internal staff';
  END IF;
  IF TG_TABLE_NAME = 'sky_events' AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.updated_by AND resort_id = NEW.resort_id
  ) THEN
    RAISE EXCEPTION 'Internal staff can only manage Sky Guide for their assigned resort';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sky_events_internal_manager
BEFORE INSERT OR UPDATE ON sky_events
FOR EACH ROW EXECUTE FUNCTION enforce_internal_sky_manager();

CREATE INDEX IF NOT EXISTS idx_sky_events_resort_status_starts
  ON sky_events(resort_id, status, starts_at);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_internal
  ON bookings(assigned_internal_id, event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_sky_event ON bookings(sky_event_id);

COMMIT;
