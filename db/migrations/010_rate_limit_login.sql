CREATE TABLE IF NOT EXISTS rate_limit_login (
  email text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_login_email_time
  ON rate_limit_login(email, attempted_at);
