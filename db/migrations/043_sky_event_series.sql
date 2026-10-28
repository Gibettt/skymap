-- Migration 043: Weekly repeating sky events share a series id so a series can be removed at once.

ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS series_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_sky_events_series ON sky_events(series_id);
