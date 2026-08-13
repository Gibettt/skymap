INSERT INTO packages (name, package_type, experience_type, location, adult_price_usd, child_price_usd, child_age_range, is_active)
VALUES
  ('Celestial Dining', 'private', 'private', 'Palm Beach', 185.00, 0.00, NULL, true),
  ('Moon Observation', 'regular', 'communal', 'Remote Observatory', 0.00, 0.00, NULL, true),
  ('Night Sky', 'regular', 'communal', 'Remote Observatory', 0.00, 0.00, NULL, true),
  ('Deep Sky', 'regular', 'communal', 'Remote Observatory', 0.00, 0.00, NULL, true)
ON CONFLICT (name) DO UPDATE SET
  package_type = EXCLUDED.package_type,
  experience_type = EXCLUDED.experience_type,
  location = EXCLUDED.location,
  adult_price_usd = EXCLUDED.adult_price_usd,
  child_price_usd = EXCLUDED.child_price_usd,
  child_age_range = EXCLUDED.child_age_range,
  is_active = EXCLUDED.is_active;
