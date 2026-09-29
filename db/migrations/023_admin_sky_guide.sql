BEGIN;

CREATE OR REPLACE FUNCTION enforce_sky_event_manager()
RETURNS trigger AS $$
DECLARE
  manager_role user_role;
  manager_status user_status;
  manager_resort_id uuid;
BEGIN
  SELECT role, status, resort_id
  INTO manager_role, manager_status, manager_resort_id
  FROM users
  WHERE id = NEW.updated_by;

  IF manager_status IS DISTINCT FROM 'active'
    OR NOT (
      manager_role = 'admin'
      OR (manager_role = 'internal' AND manager_resort_id = NEW.resort_id)
    ) THEN
    RAISE EXCEPTION 'Sky Events can only be managed by active admins or assigned internal staff';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sky_events_internal_manager ON sky_events;
CREATE TRIGGER sky_events_internal_manager
BEFORE INSERT OR UPDATE ON sky_events
FOR EACH ROW EXECUTE FUNCTION enforce_sky_event_manager();

COMMIT;
