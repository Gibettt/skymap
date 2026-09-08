CREATE TABLE IF NOT EXISTS booking_participants (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  booking_id CHAR(36) NOT NULL,
  participant_type ENUM('adult', 'child') NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  age INT NULL,
  nationality VARCHAR(80) NOT NULL,
  notes VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_booking_participants_booking
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  UNIQUE KEY uq_booking_participants_order (booking_id, sort_order),
  INDEX idx_booking_participants_booking (booking_id, sort_order),
  CHECK (age IS NULL OR age BETWEEN 0 AND 120),
  CHECK (sort_order >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
