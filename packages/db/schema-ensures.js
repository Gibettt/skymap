import { query, getDatabaseDialect } from './index.js';

let packageSchemaReady = false;
let inventorySchemaReady = false;
let skyEventSeriesReady = false;
let staffReviewReady = false;
let eventNotificationReady = false;

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
      await query(`ALTER TABLE packages MODIFY COLUMN package_type VARCHAR(80) NOT NULL`).catch(() => {});
    } else {
      await query(`ALTER TABLE packages ADD COLUMN IF NOT EXISTS primary_price_type VARCHAR(30) NOT NULL DEFAULT 'adult'`).catch(() => {});
      await query(`ALTER TABLE packages ALTER COLUMN adult_price_usd DROP NOT NULL`).catch(() => {});
      await query(`ALTER TABLE packages ALTER COLUMN package_type TYPE varchar(80)`).catch(() => {});
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

/** Adds sky_events.series_id (migration 043) when a deploy runs before the migration. */
export async function ensureSkyEventSeriesSchema() {
  if (skyEventSeriesReady) return;
  try {
    if (getDatabaseDialect() === 'mysql') {
      const { rows } = await query(`
        SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sky_events' AND COLUMN_NAME = 'series_id'
      `);
      if (Number(rows[0]?.cnt ?? rows[0]?.CNT ?? 0) === 0) {
        // Two statements: TiDB rejects an index on a column added in the same ALTER.
        await query('ALTER TABLE sky_events ADD COLUMN series_id CHAR(36) NULL');
      }
      const { rows: idx } = await query(`
        SELECT COUNT(*) AS cnt FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sky_events' AND INDEX_NAME = 'idx_sky_events_series'
      `);
      if (Number(idx[0]?.cnt ?? idx[0]?.CNT ?? 0) === 0) {
        await query('ALTER TABLE sky_events ADD INDEX idx_sky_events_series (series_id)');
      }
    } else {
      await query('ALTER TABLE sky_events ADD COLUMN IF NOT EXISTS series_id uuid NULL');
      await query('CREATE INDEX IF NOT EXISTS idx_sky_events_series ON sky_events(series_id)');
    }
    skyEventSeriesReady = true;
  } catch (err) {
    console.error('[db] ensureSkyEventSeriesSchema warning:', err?.message);
  }
}

/** Creates booking_staff_reviews (migration 044) when a deploy runs before the migration. */
export async function ensureStaffReviewSchema() {
  if (staffReviewReady) return;
  try {
    if (getDatabaseDialect() === 'mysql') {
      await query(`
        CREATE TABLE IF NOT EXISTS booking_staff_reviews (
          id CHAR(36) PRIMARY KEY,
          booking_id CHAR(36) NOT NULL UNIQUE,
          reviewer_id CHAR(36) NOT NULL,
          rating INT NOT NULL,
          comment TEXT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          CONSTRAINT fk_staff_review_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
          CONSTRAINT fk_staff_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id),
          CHECK (rating BETWEEN 1 AND 5)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
    } else {
      await query(`
        CREATE TABLE IF NOT EXISTS booking_staff_reviews (
          id uuid PRIMARY KEY,
          booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
          reviewer_id uuid NOT NULL REFERENCES users(id),
          rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
          comment text,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `);
    }
    staffReviewReady = true;
  } catch (err) {
    console.error('[db] ensureStaffReviewSchema warning:', err?.message);
  }
}

/**
 * Event notifications (migration 045): adds the 'event' notification type and the
 * sky_event_reminders log that keeps each reminder from being sent twice.
 */
export async function ensureEventNotificationSchema() {
  if (eventNotificationReady) return;
  try {
    if (getDatabaseDialect() === 'mysql') {
      const { rows } = await query(`
        SELECT COLUMN_TYPE AS column_type FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'type'
      `);
      if (!String(rows[0]?.column_type ?? rows[0]?.COLUMN_TYPE ?? '').includes("'event'")) {
        await query(`ALTER TABLE notifications
          MODIFY type ENUM('booking', 'payout', 'invoice', 'event') NOT NULL,
          MODIFY source_table ENUM('bookings', 'payout_requests', 'monthly_invoice_submissions', 'invoices', 'sky_events') NOT NULL`);
      }
      await query(`
        CREATE TABLE IF NOT EXISTS sky_event_reminders (
          sky_event_id CHAR(36) NOT NULL,
          offset_minutes INT NOT NULL,
          sent_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (sky_event_id, offset_minutes),
          CONSTRAINT fk_sky_event_reminders_event FOREIGN KEY (sky_event_id) REFERENCES sky_events(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
    } else {
      await query('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check');
      await query("ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('booking', 'payout', 'invoice', 'event'))");
      await query('ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_source_table_check');
      await query(`ALTER TABLE notifications ADD CONSTRAINT notifications_source_table_check
        CHECK (source_table IN ('bookings', 'payout_requests', 'monthly_invoice_submissions', 'invoices', 'sky_events'))`);
      await query(`
        CREATE TABLE IF NOT EXISTS sky_event_reminders (
          sky_event_id uuid NOT NULL REFERENCES sky_events(id) ON DELETE CASCADE,
          offset_minutes integer NOT NULL,
          sent_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (sky_event_id, offset_minutes)
        )
      `);
    }
    eventNotificationReady = true;
  } catch (err) {
    console.error('[db] ensureEventNotificationSchema warning:', err?.message);
  }
}
