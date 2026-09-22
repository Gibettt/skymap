START TRANSACTION;

ALTER TABLE resorts
  ADD COLUMN public_description TEXT NULL AFTER observation_spots,
  ADD COLUMN image_data LONGBLOB NULL AFTER public_description,
  ADD COLUMN image_mime_type VARCHAR(120) NULL AFTER image_data,
  ADD COLUMN image_file_name VARCHAR(255) NULL AFTER image_mime_type;

INSERT INTO access_permissions
  (permission_key, name, description, application, sort_order)
VALUES
  ('staff.resort_profile', 'Public Resort Profile',
   'Manage the assigned resort content displayed on the public landing page.', 'staff', 160)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  application = VALUES(application),
  sort_order = VALUES(sort_order);

INSERT IGNORE INTO access_role_permissions (access_role_id, permission_key)
SELECT id, 'staff.resort_profile'
FROM access_roles
WHERE slug = 'internal' AND base_role = 'internal' AND is_system = TRUE;

COMMIT;
