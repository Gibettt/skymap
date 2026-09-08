CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number varchar(48) NOT NULL UNIQUE,
  invoice_type text NOT NULL CHECK (invoice_type IN ('customer', 'staff_payout')),
  status text NOT NULL CHECK (status IN ('issued', 'paid')),
  booking_id uuid UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
  payout_request_id uuid UNIQUE REFERENCES payout_requests(id) ON DELETE RESTRICT,
  recipient_name varchar(200) NOT NULL,
  recipient_email varchar(320),
  recipient_phone varchar(80),
  recipient_detail text,
  payment_method text,
  currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  subtotal_usd numeric(12,2) NOT NULL CHECK (subtotal_usd >= 0),
  service_charge_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (service_charge_usd >= 0),
  tax_usd numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_usd >= 0),
  total_usd numeric(12,2) NOT NULL CHECK (total_usd > 0),
  line_items jsonb NOT NULL CHECK (jsonb_typeof(line_items) = 'array'),
  source_snapshot jsonb NOT NULL CHECK (jsonb_typeof(source_snapshot) = 'object'),
  notes text,
  issued_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (invoice_type = 'customer' AND status = 'issued' AND booking_id IS NOT NULL AND payout_request_id IS NULL)
    OR
    (invoice_type = 'staff_payout' AND status = 'paid' AND booking_id IS NULL AND payout_request_id IS NOT NULL)
  ),
  CHECK (due_date IS NULL OR due_date >= issued_at::date),
  CHECK (total_usd = subtotal_usd + service_charge_usd + tax_usd)
);

DROP TRIGGER IF EXISTS invoices_set_updated_at ON invoices;
CREATE TRIGGER invoices_set_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_invoices_type_issued ON invoices(invoice_type, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_recipient ON invoices(recipient_name);
CREATE INDEX IF NOT EXISTS idx_invoices_issued_by ON invoices(issued_by, issued_at DESC);
