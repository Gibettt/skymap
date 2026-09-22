BEGIN;

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS image_data bytea,
  ADD COLUMN IF NOT EXISTS image_mime_type varchar(120),
  ADD COLUMN IF NOT EXISTS image_file_name varchar(255);

INSERT INTO access_permissions
  (permission_key, name, description, application, sort_order)
VALUES
  ('staff.resort_profile', 'Public Resort Profile',
   'Manage the assigned resort content displayed on the public landing page.', 'staff', 160)
ON CONFLICT (permission_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  application = EXCLUDED.application,
  sort_order = EXCLUDED.sort_order;

INSERT INTO access_role_permissions (access_role_id, permission_key)
SELECT id, 'staff.resort_profile'
FROM access_roles
WHERE slug = 'internal' AND base_role = 'internal' AND is_system = true
ON CONFLICT (access_role_id, permission_key) DO NOTHING;

COMMIT;
