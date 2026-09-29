START TRANSACTION;

CREATE TABLE IF NOT EXISTS monthly_invoice_submissions (
  id CHAR(36) PRIMARY KEY,
  resort_id CHAR(36) NOT NULL,
  period_start DATE NOT NULL,
  status ENUM('submitted', 'reviewed') NOT NULL DEFAULT 'submitted',
  submitted_by CHAR(36) NOT NULL,
  submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reviewed_by CHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_monthly_invoice_submission_resort FOREIGN KEY (resort_id) REFERENCES resorts(id) ON DELETE RESTRICT,
  CONSTRAINT fk_monthly_invoice_submission_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_monthly_invoice_submission_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT chk_monthly_invoice_submission_review CHECK (
    (status = 'submitted' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  UNIQUE KEY uq_monthly_invoice_submission_period (resort_id, period_start),
  INDEX idx_monthly_invoice_submissions_period (period_start, submitted_at),
  INDEX idx_monthly_invoice_submissions_status (status, submitted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS monthly_invoice_submission_items (
  submission_id CHAR(36) NOT NULL,
  invoice_id CHAR(36) NOT NULL,
  CONSTRAINT fk_monthly_invoice_item_submission FOREIGN KEY (submission_id) REFERENCES monthly_invoice_submissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_monthly_invoice_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  PRIMARY KEY (submission_id, invoice_id),
  UNIQUE KEY uq_monthly_invoice_submission_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

COMMIT;
