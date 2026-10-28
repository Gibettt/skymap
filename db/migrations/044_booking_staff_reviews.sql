-- Migration 044: External staff rate each completed booking (kept apart from guest feedback).

CREATE TABLE IF NOT EXISTS booking_staff_reviews (
  id uuid PRIMARY KEY,
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
