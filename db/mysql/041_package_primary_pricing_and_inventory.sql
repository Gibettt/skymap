-- Migration 041: Package primary pricing and resort inventory

ALTER TABLE packages MODIFY adult_price_usd DECIMAL(14,2) NULL DEFAULT NULL;
ALTER TABLE packages ADD COLUMN primary_price_type VARCHAR(30) NOT NULL DEFAULT 'adult';

CREATE TABLE IF NOT EXISTS resort_inventory (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  resort_id CHAR(36) NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT 'Equipment',
  quantity INT NOT NULL DEFAULT 1,
  unit VARCHAR(40) NOT NULL DEFAULT 'pcs',
  status VARCHAR(40) NOT NULL DEFAULT 'available',
  `condition` VARCHAR(40) NOT NULL DEFAULT 'good',
  location_details VARCHAR(255) NULL,
  notes TEXT NULL,
  last_inspected_at DATETIME(3) NULL,
  updated_by_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_resort_inventory_resort FOREIGN KEY (resort_id) REFERENCES resorts(id) ON DELETE CASCADE,
  CONSTRAINT fk_resort_inventory_user FOREIGN KEY (updated_by_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_inventory_resort (resort_id)
);
