-- Migration 021: resort staffing coverage and operational transition guards.
BEGIN;

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
  WHERE resort_id = OLD.resort_id
    AND role = OLD.role
    AND status = 'active'
    AND id <> OLD.id;

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

COMMIT;
