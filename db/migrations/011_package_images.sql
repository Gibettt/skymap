ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_data bytea;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_mime_type text;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS image_file_name text;

DO $$ BEGIN
  ALTER TABLE packages ADD CONSTRAINT packages_image_mime_type_check
    CHECK (image_mime_type IS NULL OR image_mime_type IN ('image/jpeg', 'image/png', 'image/webp'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE packages ADD CONSTRAINT packages_image_data_size_check
    CHECK (image_data IS NULL OR octet_length(image_data) <= 2097152);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
