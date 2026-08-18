-- Migration 012: Add latitude, longitude, and observation_spots to resorts table
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS latitude numeric(9,6) DEFAULT 5.2893;
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS longitude numeric(9,6) DEFAULT 73.5358;
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS observation_spots text DEFAULT 'Sunset Beach, Helipad, Water Villa Jetty';

UPDATE resorts
SET latitude = 5.2893,
    longitude = 73.5358,
    observation_spots = 'Sunset Beach, Helipad, Water Villa Jetty'
WHERE code = 'LMM' AND (latitude IS NULL OR observation_spots IS NULL);
