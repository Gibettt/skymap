-- Migration 044: External staff rate each completed booking (kept apart from guest feedback).

CREATE TABLE IF NOT EXISTS booking_staff_reviews (
  id CHAR(36) PRIMARY KEY,
  booking_id CHAR(36) NOT NULL UNIQUE,
  reviewer_id CHAR(36) NOT NULL,
  rating INT NOT NULL,
  comment TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_staff_review_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id),
  CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
