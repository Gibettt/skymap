CREATE TABLE IF NOT EXISTS booking_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  participant_type text NOT NULL CHECK (participant_type IN ('adult', 'child')),
  full_name varchar(200) NOT NULL,
  age integer CHECK (age IS NULL OR age BETWEEN 0 AND 120),
  nationality varchar(80) NOT NULL,
  notes varchar(500),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_booking_participants_booking
  ON booking_participants(booking_id, sort_order);
