ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_confirmed_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS payment_reference varchar(120),
  ADD COLUMN IF NOT EXISTS payment_notes text;

UPDATE bookings AS b
SET payment_status = 'paid',
    payment_confirmed_at = COALESCE(b.payment_confirmed_at, i.issued_at),
    payment_confirmed_by = COALESCE(b.payment_confirmed_by, i.issued_by)
FROM invoices AS i
WHERE i.booking_id = b.id
  AND i.invoice_type = 'customer';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_status_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_payment_status_check
      CHECK (payment_status IN ('pending', 'paid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_payment_confirmation_check'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_payment_confirmation_check
      CHECK (
        (payment_status = 'pending' AND payment_confirmed_at IS NULL AND payment_confirmed_by IS NULL)
        OR
        (payment_status = 'paid' AND payment_confirmed_at IS NOT NULL AND payment_confirmed_by IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON bookings(payment_status, created_at DESC);
