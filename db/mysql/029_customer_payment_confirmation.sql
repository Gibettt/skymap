ALTER TABLE bookings
  ADD COLUMN payment_status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending' AFTER payment_method,
  ADD COLUMN payment_confirmed_at DATETIME(3) NULL AFTER payment_status,
  ADD COLUMN payment_confirmed_by CHAR(36) NULL AFTER payment_confirmed_at,
  ADD COLUMN payment_reference VARCHAR(120) NULL AFTER payment_confirmed_by,
  ADD COLUMN payment_notes TEXT NULL AFTER payment_reference;

UPDATE bookings AS b
JOIN invoices AS i ON i.booking_id = b.id AND i.invoice_type = 'customer'
SET b.payment_status = 'paid',
    b.payment_confirmed_at = COALESCE(b.payment_confirmed_at, i.issued_at),
    b.payment_confirmed_by = COALESCE(b.payment_confirmed_by, i.issued_by);

ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_payment_confirmer
    FOREIGN KEY (payment_confirmed_by) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_bookings_payment_confirmation
    CHECK (
      (payment_status = 'pending' AND payment_confirmed_at IS NULL AND payment_confirmed_by IS NULL)
      OR
      (payment_status = 'paid' AND payment_confirmed_at IS NOT NULL AND payment_confirmed_by IS NOT NULL)
    );

CREATE INDEX idx_bookings_payment_status
  ON bookings(payment_status, created_at DESC);
