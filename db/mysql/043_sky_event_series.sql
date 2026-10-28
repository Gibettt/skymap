-- Migration 043: Weekly repeating sky events share a series id so a series can be removed at once.

-- Two statements: TiDB rejects an index on a column added in the same ALTER.
ALTER TABLE sky_events ADD COLUMN series_id CHAR(36) NULL;
ALTER TABLE sky_events ADD INDEX idx_sky_events_series (series_id);
