-- Migration 013: Domain Events Table (EDA Outbox / Audit Pattern)
-- Stores immutable domain events emitted during business operations.
-- Enables event sourcing, async event processing, replay, and decoupling.

BEGIN;

CREATE TABLE IF NOT EXISTS domain_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Indices for event query and processing
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events (event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_created ON domain_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_unprocessed ON domain_events (processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_domain_events_actor ON domain_events (actor_id);

COMMIT;
