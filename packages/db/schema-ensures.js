import { query, getDatabaseDialect } from './index.js';

let packageSchemaReady = false;
let inventorySchemaReady = false;

export async function ensurePackageSchema() {
  if (packageSchemaReady) return;
  const dialect = getDatabaseDialect();

  try {
    if (dialect === 'mysql') {
      const checkCol = await query(`
        SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages' AND COLUMN_NAME = 'primary_price_type'
      `).catch(() => null);

      const count = checkCol?.rows?.[0] ? Number(checkCol.rows[0].cnt ?? checkCol.rows[0].CNT ?? 0) : 0;
      if (count === 0) {
        await query(`ALTER TABLE packages ADD COLUMN primary_price_type VARCHAR(30) NOT NULL DEFAULT 'adult'`).catch(() => {});
      }

      await query(`ALTER TABLE packages MODIFY adult_price_usd DECIMAL(14,2) NULL DEFAULT NULL`).catch(() => {});
    } else {
      await query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS primary_price_type VARCHAR(30) NOT NULL DEFAULT 'adult'`).catch(() => {});
      await query(`ALTER TABLE packages ALTER COLUMN adult_price_usd DROP NOT NULL`).catch(() => {});
    }
    packageSchemaReady = true;
  } catch (err) {
    console.error('[db] ensurePackageSchema warning:', err?.message);
  }
}

export async function ensureInventorySchema() {
  if (inventorySchemaReady) return;
  const dialect = getDatabaseDialect();

  try {
    if (dialect === 'mysql') {
      await query(`
        CREATE TABLE IF NOT EXISTS resort_inventory (
          id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
          resort_id CHAR(36) NOT NULL,
          item_name VARCHAR(150) NOT NULL,
          category VARCHAR(80) NOT NULL DEFAULT 'Equipment',
          quantity INT NOT NULL DEFAULT 1,
          unit VARCHAR(40) NOT NULL DEFAULT 'pcs',
          status VARCHAR(40) NOT NULL DEFAULT 'available',
          \`condition\` VARCHAR(40) NOT NULL DEFAULT 'good',
          location_details VARCHAR(255) NULL,
          notes TEXT NULL,
          last_inspected_at DATETIME(3) NULL,
          updated_by_id CHAR(36) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          INDEX idx_inventory_resort (resort_id)
        )
      `).catch(() => {});
    } else {
      await query(`
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
          updated_by_id UUID NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `).catch(() => {});
      await query(`CREATE INDEX IF NOT EXISTS idx_inventory_resort ON resort_inventory(resort_id)`).catch(() => {});
    }
    inventorySchemaReady = true;
  } catch (err) {
    console.error('[db] ensureInventorySchema warning:', err?.message);
  }
}
