-- Migration 022: package-derived pricing and resort package readiness.
BEGIN;

UPDATE packages
SET is_chargeable = (adult_price_usd > 0 OR COALESCE(child_price_usd, 0) > 0)
WHERE is_chargeable IS DISTINCT FROM (adult_price_usd > 0 OR COALESCE(child_price_usd, 0) > 0);

ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_price_chargeability_check;
ALTER TABLE packages ADD CONSTRAINT packages_price_chargeability_check
  CHECK (is_chargeable = (adult_price_usd > 0 OR COALESCE(child_price_usd, 0) > 0));

UPDATE resorts r
SET status = 'inactive'
WHERE r.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM packages p WHERE p.resort_id = r.id AND p.is_active = true
  );

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
      AND COALESCE(staff.active_external_count, 0) > 0
      AND COALESCE(package_count.active_package_count, 0) > 0 THEN 'ready'
    WHEN COALESCE(staff.active_internal_count, 0) > 0
      AND COALESCE(staff.active_external_count, 0) > 0 THEN 'needs_package'
    WHEN COALESCE(staff.active_internal_count, 0) = 0
      AND COALESCE(staff.active_external_count, 0) = 0 THEN 'needs_both'
    WHEN COALESCE(staff.active_internal_count, 0) = 0 THEN 'needs_internal'
    ELSE 'needs_external'
  END AS coverage_status,
  COALESCE(package_count.active_package_count, 0)::int AS active_package_count
FROM resorts r
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE role = 'internal' AND status = 'active') AS active_internal_count,
    COUNT(*) FILTER (WHERE role = 'external' AND status = 'active') AS active_external_count
  FROM users
  WHERE resort_id = r.id
) staff ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS active_package_count
  FROM packages
  WHERE resort_id = r.id AND is_active = true
) package_count ON true
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
  package_count integer;
  open_count integer;
BEGIN
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT
      COUNT(*) FILTER (WHERE role = 'internal' AND status = 'active'),
      COUNT(*) FILTER (WHERE role = 'external' AND status = 'active')
    INTO internal_count, external_count
    FROM users
    WHERE resort_id = NEW.id;

    SELECT COUNT(*) INTO package_count
    FROM packages
    WHERE resort_id = NEW.id AND is_active = true;

    IF internal_count = 0 OR external_count = 0 THEN
      RAISE EXCEPTION 'Active resort requires Internal and External staff coverage'
        USING ERRCODE = '23514', CONSTRAINT = 'resort_staff_coverage_required';
    END IF;
    IF package_count = 0 THEN
      RAISE EXCEPTION 'Active resort requires an active package'
        USING ERRCODE = '23514', CONSTRAINT = 'resort_active_package_required';
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

CREATE OR REPLACE FUNCTION enforce_last_active_resort_package()
RETURNS trigger AS $$
DECLARE
  replacement_count integer;
  current_resort_status user_status;
  keeps_coverage boolean;
BEGIN
  IF OLD.resort_id IS NULL OR OLD.is_active = false THEN RETURN COALESCE(NEW, OLD); END IF;

  keeps_coverage := TG_OP <> 'DELETE'
    AND NEW.is_active = true
    AND NEW.resort_id = OLD.resort_id;
  IF keeps_coverage THEN RETURN NEW; END IF;

  SELECT status INTO current_resort_status FROM resorts WHERE id = OLD.resort_id FOR UPDATE;
  IF current_resort_status <> 'active' THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT COUNT(*) INTO replacement_count
  FROM packages
  WHERE resort_id = OLD.resort_id AND is_active = true AND id <> OLD.id;

  IF replacement_count = 0 THEN
    RAISE EXCEPTION 'Last active package cannot leave an active resort'
      USING ERRCODE = '23514', CONSTRAINT = 'last_active_resort_package';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS packages_last_active_resort_package ON packages;
CREATE TRIGGER packages_last_active_resort_package
BEFORE UPDATE OF is_active, resort_id OR DELETE ON packages
FOR EACH ROW EXECUTE FUNCTION enforce_last_active_resort_package();

COMMIT;
