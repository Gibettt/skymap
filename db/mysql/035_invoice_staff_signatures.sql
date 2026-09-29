START TRANSACTION;

ALTER TABLE invoices
  ADD COLUMN signature_data_url MEDIUMTEXT NULL AFTER issued_by,
  ADD COLUMN signature_signer_name VARCHAR(200) NULL AFTER signature_data_url,
  ADD COLUMN signed_by CHAR(36) NULL AFTER signature_signer_name,
  ADD COLUMN signed_at DATETIME(3) NULL AFTER signed_by,
  ADD CONSTRAINT fk_invoices_signer FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_invoices_signature_complete CHECK (
    (signature_data_url IS NULL AND signature_signer_name IS NULL AND signed_by IS NULL AND signed_at IS NULL)
    OR
    (signature_data_url IS NOT NULL AND signature_signer_name IS NOT NULL AND signed_by IS NOT NULL AND signed_at IS NOT NULL)
  ),
  ADD INDEX idx_invoices_signed_by (signed_by, signed_at);

COMMIT;
