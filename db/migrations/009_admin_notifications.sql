CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking', 'payout')),
  source_table text NOT NULL CHECK (source_table IN ('bookings', 'payout_requests')),
  source_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  meta text,
  link text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipient_user_id, type, source_id)
);

DROP TRIGGER IF EXISTS notifications_set_updated_at ON notifications;
CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read
  ON notifications(recipient_user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_source
  ON notifications(type, source_id);
