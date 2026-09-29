START TRANSACTION;

ALTER TABLE invoices
  ADD COLUMN resort_recorded_at DATETIME(3) NULL AFTER signed_at,
  ADD COLUMN resort_recorded_by CHAR(36) NULL AFTER resort_recorded_at,
  ADD CONSTRAINT fk_invoices_resort_recorder FOREIGN KEY (resort_recorded_by) REFERENCES users(id) ON DELETE RESTRICT,
  ADD CONSTRAINT chk_invoices_resort_record_complete CHECK (
    (resort_recorded_at IS NULL AND resort_recorded_by IS NULL)
    OR
    (resort_recorded_at IS NOT NULL AND resort_recorded_by IS NOT NULL)
  ),
  ADD INDEX idx_invoices_resort_recorded (resort_recorded_at);

COMMIT;
