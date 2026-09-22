BEGIN;

CREATE TABLE IF NOT EXISTS sky_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  slug varchar(80) NOT NULL CHECK (char_length(trim(slug)) BETWEEN 1 AND 80),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resort_id, slug),
  UNIQUE (resort_id, name)
);

CREATE INDEX IF NOT EXISTS idx_sky_event_types_active
  ON sky_event_types(resort_id, is_active, name);

ALTER TABLE sky_events
  DROP CONSTRAINT IF EXISTS sky_events_event_type_check;

ALTER TABLE sky_events
  ALTER COLUMN event_type TYPE varchar(80);

COMMIT;
