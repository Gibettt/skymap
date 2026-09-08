BEGIN;

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

COMMIT;
