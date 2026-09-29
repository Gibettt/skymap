CREATE TABLE IF NOT EXISTS monthly_invoice_staff_signatures (
  id uuid PRIMARY KEY,
  resort_id uuid NOT NULL REFERENCES resorts(id) ON DELETE RESTRICT,
  period_start date NOT NULL,
  signature_data_url text NOT NULL,
  signer_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  signer_name varchar(200) NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (resort_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_monthly_invoice_staff_signatures_period
  ON monthly_invoice_staff_signatures(period_start DESC, signed_at DESC);
