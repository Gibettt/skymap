ALTER TABLE sky_events
  ADD COLUMN image_data LONGBLOB NULL AFTER image_url,
  ADD COLUMN image_mime_type VARCHAR(120) NULL AFTER image_data,
  ADD COLUMN image_file_name VARCHAR(255) NULL AFTER image_mime_type;
