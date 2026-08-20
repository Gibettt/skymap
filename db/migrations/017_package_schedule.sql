BEGIN;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS schedule text;

UPDATE packages
SET schedule = CASE name
  WHEN 'Solar Observation' THEN 'Every Tuesday & Saturday | 11:00 - 12:00'
  WHEN 'Sun Observation' THEN 'Every Tuesday & Saturday | 11:00 - 12:00'
  WHEN 'Beach Stargazing' THEN 'Monday, Thursday & Saturday | 21:00 - 22:00'
  WHEN 'Private Stargazing' THEN 'Upon request | 21:00 - 22:00'
  WHEN 'Private Beach Stargazing' THEN 'Upon request | 21:00 - 22:00'
  WHEN 'Celestial Dining' THEN 'Upon request | 19:00 - 20:00'
  WHEN 'Moonlight Table' THEN 'Upon request'
  WHEN 'Kids Stargazing' THEN 'Every Thursday | 19:30 - 20:30'
  ELSE 'Upon request'
END
WHERE schedule IS NULL OR btrim(schedule) = '';

ALTER TABLE packages
  ALTER COLUMN schedule SET DEFAULT 'Upon request',
  ALTER COLUMN schedule SET NOT NULL;

ALTER TABLE packages
  DROP CONSTRAINT IF EXISTS packages_schedule_length_check;

ALTER TABLE packages
  ADD CONSTRAINT packages_schedule_length_check
  CHECK (char_length(btrim(schedule)) BETWEEN 1 AND 120);

COMMIT;
