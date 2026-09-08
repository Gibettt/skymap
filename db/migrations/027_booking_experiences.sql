CREATE TABLE IF NOT EXISTS booking_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES packages(id),
  sky_event_id uuid REFERENCES sky_events(id) ON DELETE SET NULL,
  event_date date NOT NULL,
  time_start time NOT NULL,
  time_end time NOT NULL,
  observation_spot varchar(120),
  booked_adult_price_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (booked_adult_price_usd >= 0),
  booked_child_price_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (booked_child_price_usd >= 0),
  base_total_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (base_total_usd >= 0),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, sort_order),
  CHECK (time_end > time_start)
);

CREATE INDEX IF NOT EXISTS idx_booking_experiences_booking
  ON booking_experiences(booking_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_booking_experiences_package
  ON booking_experiences(package_id);
