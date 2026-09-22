CREATE TABLE IF NOT EXISTS sky_event_types (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  resort_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_sky_event_types_resort FOREIGN KEY (resort_id) REFERENCES resorts(id) ON DELETE CASCADE,
  CONSTRAINT fk_sky_event_types_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE KEY uq_sky_event_types_resort_slug (resort_id, slug),
  UNIQUE KEY uq_sky_event_types_resort_name (resort_id, name),
  INDEX idx_sky_event_types_active (resort_id, is_active, name),
  CHECK (CHAR_LENGTH(TRIM(name)) BETWEEN 1 AND 80),
  CHECK (CHAR_LENGTH(TRIM(slug)) BETWEEN 1 AND 80)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE sky_events
  MODIFY COLUMN event_type VARCHAR(80) NOT NULL;
