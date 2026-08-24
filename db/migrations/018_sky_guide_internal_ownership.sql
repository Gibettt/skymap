BEGIN;

ALTER TABLE sky_app_settings
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);

CREATE OR REPLACE FUNCTION enforce_internal_sky_manager()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = NEW.updated_by AND role = 'internal' AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Sky Guide can only be managed by active internal staff';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sky_app_settings_internal_manager ON sky_app_settings;
CREATE TRIGGER sky_app_settings_internal_manager
BEFORE INSERT OR UPDATE ON sky_app_settings
FOR EACH ROW EXECUTE FUNCTION enforce_internal_sky_manager();

DROP TRIGGER IF EXISTS sky_events_internal_manager ON sky_events;
CREATE TRIGGER sky_events_internal_manager
BEFORE INSERT OR UPDATE ON sky_events
FOR EACH ROW EXECUTE FUNCTION enforce_internal_sky_manager();

COMMIT;
