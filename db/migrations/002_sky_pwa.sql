BEGIN;

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

COMMIT;
