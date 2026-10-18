-- Migration 041: Package primary pricing and resort inventory

ALTER TABLE packages ALTER COLUMN adult_price_usd DROP NOT NULL;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS primary_price_type VARCHAR(30) NOT NULL DEFAULT 'adult';

CREATE TABLE IF NOT EXISTS resort_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resort_id UUID NOT NULL REFERENCES resorts(id) ON DELETE CASCADE,
  item_name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Equipment',
  quantity INT NOT NULL DEFAULT 1,
  unit VARCHAR(40) NOT NULL DEFAULT 'pcs',
  status VARCHAR(40) NOT NULL DEFAULT 'available',
  condition VARCHAR(40) NOT NULL DEFAULT 'good',
  location_details VARCHAR(255) NULL,
  notes TEXT NULL,
  last_inspected_at TIMESTAMPTZ NULL,
  updated_by_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_resort ON resort_inventory(resort_id);
