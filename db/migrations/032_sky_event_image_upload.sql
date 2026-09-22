BEGIN;

ALTER TABLE sky_events
  ADD COLUMN IF NOT EXISTS image_data bytea,
  ADD COLUMN IF NOT EXISTS image_mime_type varchar(120),
  ADD COLUMN IF NOT EXISTS image_file_name varchar(255);

COMMIT;
