CREATE TABLE IF NOT EXISTS rate_limit_registration (
  scope varchar(32) NOT NULL,
  key_hash char(64) NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  PRIMARY KEY (scope, key_hash)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_registration_window
  ON rate_limit_registration(window_started_at);
