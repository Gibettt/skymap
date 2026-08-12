CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id),
  resort_id uuid REFERENCES resorts(id),
  amount_usd numeric(10,2) NOT NULL CHECK (amount_usd > 0),
  commission_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (commission_usd >= 0),
  star_bonus_usd numeric(10,2) NOT NULL DEFAULT 0 CHECK (star_bonus_usd >= 0),
  star_points numeric(10,2) NOT NULL DEFAULT 0 CHECK (star_points >= 0),
  full_stars integer NOT NULL DEFAULT 0 CHECK (full_stars BETWEEN 0 AND 5),
  payment_method text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  notes text,
  admin_notes text,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'paid', 'rejected')),
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS payout_requests_set_updated_at ON payout_requests;
CREATE TRIGGER payout_requests_set_updated_at
BEFORE UPDATE ON payout_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_payout_requests_requester ON payout_requests(requester_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
