-- Migration 045: Notifications for resort events, and a log so each reminder is sent once.

ALTER TABLE notifications
  MODIFY type ENUM('booking', 'payout', 'invoice', 'event') NOT NULL,
  MODIFY source_table ENUM('bookings', 'payout_requests', 'monthly_invoice_submissions', 'invoices', 'sky_events') NOT NULL;

CREATE TABLE IF NOT EXISTS sky_event_reminders (
  sky_event_id CHAR(36) NOT NULL,
  offset_minutes INT NOT NULL,
  sent_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (sky_event_id, offset_minutes),
  CONSTRAINT fk_sky_event_reminders_event FOREIGN KEY (sky_event_id) REFERENCES sky_events(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
