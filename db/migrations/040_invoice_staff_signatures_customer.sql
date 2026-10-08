ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS staff_signature_data_url text,
  ADD COLUMN IF NOT EXISTS staff_signer_name varchar(200),
  ADD COLUMN IF NOT EXISTS staff_signed_at timestamptz;
