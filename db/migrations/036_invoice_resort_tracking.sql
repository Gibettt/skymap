ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS resort_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS resort_recorded_by uuid REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_resort_record_complete;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_resort_record_complete CHECK (
    (resort_recorded_at IS NULL AND resort_recorded_by IS NULL)
    OR
    (resort_recorded_at IS NOT NULL AND resort_recorded_by IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_invoices_resort_recorded ON invoices(resort_recorded_at DESC);
