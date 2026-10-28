-- Migration 045: Notifications for resort events, and a log so each reminder is sent once.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('booking', 'payout', 'invoice', 'event'));
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_source_table_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_source_table_check
  CHECK (source_table IN ('bookings', 'payout_requests', 'monthly_invoice_submissions', 'invoices', 'sky_events'));

CREATE TABLE IF NOT EXISTS sky_event_reminders (
  sky_event_id uuid NOT NULL REFERENCES sky_events(id) ON DELETE CASCADE,
  offset_minutes integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (sky_event_id, offset_minutes)
);
