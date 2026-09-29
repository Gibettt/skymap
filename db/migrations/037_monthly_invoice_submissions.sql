CREATE TABLE IF NOT EXISTS monthly_invoice_submissions (
  id uuid PRIMARY KEY,
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
  submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  submitted_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (resort_id, period_start),
  CHECK (
    (status = 'submitted' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR
    (status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS monthly_invoice_submission_items (
  submission_id uuid NOT NULL REFERENCES monthly_invoice_submissions(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  PRIMARY KEY (submission_id, invoice_id),
  UNIQUE (invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_invoice_submissions_period
  ON monthly_invoice_submissions(period_start DESC, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_monthly_invoice_submissions_status
  ON monthly_invoice_submissions(status, submitted_at DESC);
