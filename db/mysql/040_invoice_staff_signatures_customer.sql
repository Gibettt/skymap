ALTER TABLE invoices
  ADD COLUMN staff_signature_data_url MEDIUMTEXT NULL,
  ADD COLUMN staff_signer_name VARCHAR(200) NULL,
  ADD COLUMN staff_signed_at DATETIME(3) NULL;
