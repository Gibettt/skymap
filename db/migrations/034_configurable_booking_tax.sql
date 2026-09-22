BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS tax_label varchar(80) NOT NULL DEFAULT 'Tourism GST (TGST)',
  ADD COLUMN IF NOT EXISTS tax_rate_percent numeric(5,2) NOT NULL DEFAULT 17.00
    CHECK (tax_rate_percent BETWEEN 0 AND 100);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS tax_label varchar(80) NOT NULL DEFAULT 'Tourism GST (TGST)',
  ADD COLUMN IF NOT EXISTS tax_rate_percent numeric(5,2) NOT NULL DEFAULT 17.00
    CHECK (tax_rate_percent BETWEEN 0 AND 100);

COMMIT;
