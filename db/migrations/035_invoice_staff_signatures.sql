ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS signature_data_url text,
  ADD COLUMN IF NOT EXISTS signature_signer_name varchar(200),
  ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_signature_complete;

ALTER TABLE invoices
  ADD CONSTRAINT invoices_signature_complete CHECK (
    (signature_data_url IS NULL AND signature_signer_name IS NULL AND signed_by IS NULL AND signed_at IS NULL)
    OR
    (signature_data_url IS NOT NULL AND signature_signer_name IS NOT NULL AND signed_by IS NOT NULL AND signed_at IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_invoices_signed_by ON invoices(signed_by, signed_at DESC);
