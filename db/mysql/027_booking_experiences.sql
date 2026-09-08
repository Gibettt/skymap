CREATE TABLE IF NOT EXISTS booking_experiences (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  package_id CHAR(36) NOT NULL,
  sky_event_id CHAR(36) NULL,
  event_date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  observation_spot VARCHAR(120) NULL,
  booked_adult_price_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  booked_child_price_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  base_total_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_booking_experiences_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_experiences_package
    FOREIGN KEY (package_id) REFERENCES packages(id),
  CONSTRAINT fk_booking_experiences_sky_event
    FOREIGN KEY (sky_event_id) REFERENCES sky_events(id) ON DELETE SET NULL,
  UNIQUE KEY uq_booking_experiences_order (booking_id, sort_order),
  INDEX idx_booking_experiences_booking (booking_id, sort_order),
  INDEX idx_booking_experiences_package (package_id),
  CHECK (booked_adult_price_usd >= 0),
  CHECK (booked_child_price_usd >= 0),
  CHECK (base_total_usd >= 0),
  CHECK (sort_order >= 0),
  CHECK (time_end > time_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
