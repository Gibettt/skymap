BEGIN;

CREATE TABLE IF NOT EXISTS access_permissions (
  permission_key varchar(80) PRIMARY KEY,
  name varchar(120) NOT NULL,
  description varchar(240) NOT NULL DEFAULT '',
  application varchar(40) NOT NULL CHECK (application IN ('admin', 'staff')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0)
);

CREATE TABLE IF NOT EXISTS access_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(80) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  description varchar(240) NOT NULL DEFAULT '',
  base_role user_role NOT NULL,
  access_level varchar(20) NOT NULL DEFAULT 'scoped'
    CHECK (access_level IN ('full', 'scoped', 'read_only')),
  is_system boolean NOT NULL DEFAULT false,
  status varchar(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  permissions_updated_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_roles_name_ci
  ON access_roles (lower(name));

CREATE TABLE IF NOT EXISTS access_role_permissions (
  access_role_id uuid NOT NULL REFERENCES access_roles(id) ON DELETE CASCADE,
  permission_key varchar(80) NOT NULL REFERENCES access_permissions(permission_key) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (access_role_id, permission_key)
);

INSERT INTO access_permissions (permission_key, name, description, application, sort_order) VALUES
  ('admin.overview', 'Overview', 'View operational dashboard metrics and recent activity.', 'admin', 10),
  ('admin.bookings', 'Bookings', 'View and manage guest bookings and booking actions.', 'admin', 20),
  ('admin.resorts', 'Partner Resorts', 'View and manage partner resort records.', 'admin', 30),
  ('admin.finance', 'Finance', 'View finance reports, payouts, and reward settings.', 'admin', 40),
  ('admin.packages', 'Packages', 'View and manage experience packages and pricing.', 'admin', 50),
  ('admin.users', 'Users', 'View and manage administrator and staff accounts.', 'admin', 60),
  ('admin.roles', 'Roles', 'Manage roles, members, permission sets, and access reviews.', 'admin', 70),
  ('admin.logs', 'Logs', 'View security and operational audit logs.', 'admin', 80),
  ('admin.calendar', 'Calendar', 'View and manage resort calendar and sky events.', 'admin', 90),
  ('admin.notifications', 'Notifications', 'View and manage administrator notifications.', 'admin', 100),
  ('admin.settings', 'Settings', 'Manage Ephemeris application settings.', 'admin', 110),
  ('staff.bookings', 'Staff Bookings', 'View and manage bookings allowed by the staff portal.', 'staff', 120),
  ('staff.finance', 'Staff Finance', 'View commissions, rewards, and request payouts.', 'staff', 130),
  ('staff.sky_guide', 'Sky Guide', 'View and manage authorized resort sky events and settings.', 'staff', 140),
  ('staff.notifications', 'Staff Notifications', 'View and manage staff notifications.', 'staff', 150)
ON CONFLICT (permission_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  application = EXCLUDED.application,
  sort_order = EXCLUDED.sort_order;

INSERT INTO access_roles
  (slug, name, description, base_role, access_level, is_system, status, last_reviewed_at)
VALUES
  ('admin', 'Admin', 'Full administration access across Ephemeris.', 'admin', 'full', true, 'active', now()),
  ('internal', 'Internal', 'Internal resort operations and Sky Guide management.', 'internal', 'scoped', true, 'active', now()),
  ('external', 'External', 'External staff access scoped to their resort and own work.', 'external', 'scoped', true, 'active', now())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_role = EXCLUDED.base_role,
  access_level = EXCLUDED.access_level,
  is_system = true,
  status = 'active';

INSERT INTO access_role_permissions (access_role_id, permission_key)
SELECT role.id, permission.permission_key
FROM access_roles role
JOIN access_permissions permission ON
  (role.slug = 'admin' AND permission.application = 'admin')
  OR (role.slug = 'internal' AND permission.permission_key IN (
    'staff.bookings', 'staff.finance', 'staff.sky_guide', 'staff.notifications'
  ))
  OR (role.slug = 'external' AND permission.permission_key IN (
    'staff.bookings', 'staff.finance', 'staff.sky_guide', 'staff.notifications'
  ))
ON CONFLICT (access_role_id, permission_key) DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_role_id uuid REFERENCES access_roles(id) ON DELETE RESTRICT;

UPDATE users user_record
SET access_role_id = role.id
FROM access_roles role
WHERE user_record.access_role_id IS NULL
  AND role.is_system
  AND role.base_role = user_record.role;

ALTER TABLE users ALTER COLUMN access_role_id SET NOT NULL;

CREATE OR REPLACE FUNCTION assign_compatible_access_role()
RETURNS trigger AS $$
DECLARE
  assigned_base_role user_role;
BEGIN
  IF NEW.access_role_id IS NOT NULL THEN
    SELECT base_role INTO assigned_base_role
    FROM access_roles
    WHERE id = NEW.access_role_id AND status = 'active';
  END IF;

  IF assigned_base_role IS NULL OR assigned_base_role <> NEW.role THEN
    SELECT id INTO NEW.access_role_id
    FROM access_roles
    WHERE is_system AND status = 'active' AND base_role = NEW.role
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF NEW.access_role_id IS NULL THEN
    RAISE EXCEPTION 'No active access role is available for base role %', NEW.role
      USING ERRCODE = '23514', CONSTRAINT = 'users_access_role_required';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_assign_compatible_access_role ON users;
CREATE TRIGGER users_assign_compatible_access_role
BEFORE INSERT OR UPDATE OF role, access_role_id ON users
FOR EACH ROW EXECUTE FUNCTION assign_compatible_access_role();

DROP TRIGGER IF EXISTS access_roles_set_updated_at ON access_roles;
CREATE TRIGGER access_roles_set_updated_at
BEFORE UPDATE ON access_roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_access_role_id ON users(access_role_id);
CREATE INDEX IF NOT EXISTS idx_access_roles_base_status ON access_roles(base_role, status);
CREATE INDEX IF NOT EXISTS idx_access_role_permissions_permission
  ON access_role_permissions(permission_key, access_role_id);

COMMIT;
