START TRANSACTION;

CREATE TABLE IF NOT EXISTS monthly_invoice_staff_signatures (
  id CHAR(36) PRIMARY KEY,
  resort_id CHAR(36) NOT NULL,
  period_start DATE NOT NULL,
  signature_data_url MEDIUMTEXT NOT NULL,
  signer_id CHAR(36) NOT NULL,
  signer_name VARCHAR(200) NOT NULL,
  signed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_monthly_invoice_staff_signature_resort FOREIGN KEY (resort_id) REFERENCES resorts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_monthly_invoice_staff_signature_signer FOREIGN KEY (signer_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_monthly_invoice_staff_signature_period (resort_id, period_start),
  INDEX idx_monthly_invoice_staff_signatures_period (period_start, signed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

COMMIT;
