ALTER TABLE bookings
  DROP COLUMN IF EXISTS seating_setup,
  DROP COLUMN IF EXISTS photo_request;
