BEGIN;

CREATE TABLE IF NOT EXISTS package_inclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  label varchar(120) NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 120),
  sort_order integer NOT NULL CHECK (sort_order >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, sort_order)
);

DROP TRIGGER IF EXISTS package_inclusions_set_updated_at ON package_inclusions;
CREATE TRIGGER package_inclusions_set_updated_at
BEFORE UPDATE ON package_inclusions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_package_inclusions_package_active
  ON package_inclusions(package_id, is_active, sort_order);

INSERT INTO package_inclusions (package_id, label, sort_order)
SELECT p.id, preset.label, preset.sort_order
FROM packages p
JOIN (VALUES
  ('Solar Observation', 'Photo of the sun', 0),
  ('Sun Observation', 'Photo of the sun', 0),
  ('Beach Stargazing', 'Beverages', 0),
  ('Private Stargazing', 'Beverages', 0),
  ('Private Stargazing', 'Astro-portrait', 1),
  ('Private Beach Stargazing', 'Beverages', 0),
  ('Private Beach Stargazing', 'Astro-portrait', 1),
  ('Celestial Dining', 'Astro-portrait', 0),
  ('Moonlight Table', 'Moon photo', 0),
  ('Moonlight Table', 'Personalised night sky map', 1),
  ('Kids Stargazing', 'Light refreshment', 0)
) AS preset(package_name, label, sort_order)
  ON preset.package_name = p.name
ON CONFLICT (package_id, sort_order) DO NOTHING;

COMMIT;
