CREATE TABLE IF NOT EXISTS resorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  location text,
  timezone text NOT NULL DEFAULT 'Indian/Maldives',
  contact_name text,
  contact_phone text,
  status user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS resort_id uuid REFERENCES resorts(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resort_id uuid REFERENCES resorts(id);

INSERT INTO resorts (name, code, location, timezone, contact_name, contact_phone, status)
VALUES ('Le Meridien Maldives', 'LMM', 'Thilamaafushi, Maldives', 'Indian/Maldives', 'Resort Concierge', '+960-000-0100', 'active')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  timezone = EXCLUDED.timezone,
  contact_name = EXCLUDED.contact_name,
  contact_phone = EXCLUDED.contact_phone,
  status = EXCLUDED.status;

UPDATE users
SET resort_id = (SELECT id FROM resorts WHERE code = 'LMM')
WHERE role = 'external' AND resort_id IS NULL;

UPDATE bookings b
SET resort_id = u.resort_id
FROM users u
WHERE b.staff_id = u.id AND u.role = 'external' AND b.resort_id IS NULL;

DROP TRIGGER IF EXISTS resorts_set_updated_at ON resorts;
CREATE TRIGGER resorts_set_updated_at
BEFORE UPDATE ON resorts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_users_resort_id ON users(resort_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resort_id ON bookings(resort_id);
