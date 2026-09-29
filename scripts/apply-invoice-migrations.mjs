import mysql from 'mysql2/promise';

async function run() {
  console.log('Connecting to TiDB...');
  const conn = await mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2mwLyFq56iFYwVc.root',
    password: 'eY62TfmAgA3cfTo2',
    database: 'ephemeris',
    ssl: { rejectUnauthorized: false }
  });
  console.log('Connected to TiDB successfully!');

  // Check existing columns
  const [existingCols] = await conn.query('SHOW COLUMNS FROM invoices');
  const colNames = new Set(existingCols.map(c => c.Field));

  // Step 1: Migration 035 - add columns one by one to avoid TiDB column reference limitation
  if (!colNames.has('signature_data_url')) {
    console.log('035: Adding signature_data_url...');
    await conn.query('ALTER TABLE invoices ADD COLUMN signature_data_url MEDIUMTEXT NULL AFTER issued_by');
  }
  if (!colNames.has('signature_signer_name')) {
    console.log('035: Adding signature_signer_name...');
    await conn.query('ALTER TABLE invoices ADD COLUMN signature_signer_name VARCHAR(200) NULL AFTER signature_data_url');
  }
  if (!colNames.has('signed_by')) {
    console.log('035: Adding signed_by...');
    await conn.query('ALTER TABLE invoices ADD COLUMN signed_by CHAR(36) NULL AFTER signature_signer_name');
  }
  if (!colNames.has('signed_at')) {
    console.log('035: Adding signed_at...');
    await conn.query('ALTER TABLE invoices ADD COLUMN signed_at DATETIME(3) NULL AFTER signed_by');
  }
  console.log('035: Signature columns added.');

  try {
    console.log('035: Adding fk_invoices_signer...');
    await conn.query(`
      ALTER TABLE invoices
        ADD CONSTRAINT fk_invoices_signer FOREIGN KEY (signed_by) REFERENCES users(id) ON DELETE RESTRICT
    `);
    console.log('035: fk_invoices_signer added.');
  } catch (err) {
    console.log('035: fk_invoices_signer notice:', err.message);
  }

  try {
    console.log('035: Adding chk_invoices_signature_complete...');
    await conn.query(`
      ALTER TABLE invoices
        ADD CONSTRAINT chk_invoices_signature_complete CHECK (
          (signature_data_url IS NULL AND signature_signer_name IS NULL AND signed_by IS NULL AND signed_at IS NULL)
          OR
          (signature_data_url IS NOT NULL AND signature_signer_name IS NOT NULL AND signed_by IS NOT NULL AND signed_at IS NOT NULL)
        )
    `);
    console.log('035: chk_invoices_signature_complete added.');
  } catch (err) {
    console.log('035: chk_invoices_signature_complete notice:', err.message);
  }

  try {
    console.log('035: Adding idx_invoices_signed_by...');
    await conn.query(`
      ALTER TABLE invoices
        ADD INDEX idx_invoices_signed_by (signed_by, signed_at)
    `);
    console.log('035: idx_invoices_signed_by added.');
  } catch (err) {
    console.log('035: idx_invoices_signed_by notice:', err.message);
  }

  // Step 2: Migration 036 - add resort tracking columns
  const [colsAfter35] = await conn.query('SHOW COLUMNS FROM invoices');
  const colsSet35 = new Set(colsAfter35.map(c => c.Field));
  if (!colsSet35.has('resort_recorded_at')) {
    console.log('\n036: Adding resort_recorded_at...');
    await conn.query('ALTER TABLE invoices ADD COLUMN resort_recorded_at DATETIME(3) NULL AFTER signed_at');
  }
  if (!colsSet35.has('resort_recorded_by')) {
    console.log('036: Adding resort_recorded_by...');
    await conn.query('ALTER TABLE invoices ADD COLUMN resort_recorded_by CHAR(36) NULL AFTER resort_recorded_at');
  }
  console.log('036: Resort recording columns added.');

  try {
    console.log('036: Adding fk_invoices_resort_recorder...');
    await conn.query(`
      ALTER TABLE invoices
        ADD CONSTRAINT fk_invoices_resort_recorder FOREIGN KEY (resort_recorded_by) REFERENCES users(id) ON DELETE RESTRICT
    `);
    console.log('036: fk_invoices_resort_recorder added.');
  } catch (err) {
    console.log('036: fk_invoices_resort_recorder notice:', err.message);
  }

  try {
    console.log('036: Adding chk_invoices_resort_record_complete...');
    await conn.query(`
      ALTER TABLE invoices
        ADD CONSTRAINT chk_invoices_resort_record_complete CHECK (
          (resort_recorded_at IS NULL AND resort_recorded_by IS NULL)
          OR
          (resort_recorded_at IS NOT NULL AND resort_recorded_by IS NOT NULL)
        )
    `);
    console.log('036: chk_invoices_resort_record_complete added.');
  } catch (err) {
    console.log('036: chk_invoices_resort_record_complete notice:', err.message);
  }

  try {
    console.log('036: Adding idx_invoices_resort_recorded...');
    await conn.query(`
      ALTER TABLE invoices
        ADD INDEX idx_invoices_resort_recorded (resort_recorded_at)
    `);
    console.log('036: idx_invoices_resort_recorded added.');
  } catch (err) {
    console.log('036: idx_invoices_resort_recorded notice:', err.message);
  }

  // Step 3: Migration 037 - monthly_invoice_submissions & items
  console.log('\n037: Creating monthly_invoice_submissions...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS monthly_invoice_submissions (
      id CHAR(36) PRIMARY KEY,
      resort_id CHAR(36) NOT NULL,
      period_start DATE NOT NULL,
      status ENUM('submitted', 'reviewed') NOT NULL DEFAULT 'submitted',
      submitted_by CHAR(36) NOT NULL,
      submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      reviewed_by CHAR(36) NULL,
      reviewed_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      CONSTRAINT fk_monthly_invoice_submission_resort FOREIGN KEY (resort_id) REFERENCES resorts(id) ON DELETE RESTRICT,
      CONSTRAINT fk_monthly_invoice_submission_submitter FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT fk_monthly_invoice_submission_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE RESTRICT,
      CONSTRAINT chk_monthly_invoice_submission_review CHECK (
        (status = 'submitted' AND reviewed_by IS NULL AND reviewed_at IS NULL)
        OR
        (status = 'reviewed' AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
      ),
      UNIQUE KEY uq_monthly_invoice_submission_period (resort_id, period_start),
      INDEX idx_monthly_invoice_submissions_period (period_start, submitted_at),
      INDEX idx_monthly_invoice_submissions_status (status, submitted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);
  console.log('037: monthly_invoice_submissions created.');

  console.log('037: Creating monthly_invoice_submission_items...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS monthly_invoice_submission_items (
      submission_id CHAR(36) NOT NULL,
      invoice_id CHAR(36) NOT NULL,
      CONSTRAINT fk_monthly_invoice_item_submission FOREIGN KEY (submission_id) REFERENCES monthly_invoice_submissions(id) ON DELETE CASCADE,
      CONSTRAINT fk_monthly_invoice_item_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
      PRIMARY KEY (submission_id, invoice_id),
      UNIQUE KEY uq_monthly_invoice_submission_invoice (invoice_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);
  console.log('037: monthly_invoice_submission_items created.');

  // Step 4: Migration 038 - monthly_invoice_staff_signatures
  console.log('\n038: Creating monthly_invoice_staff_signatures...');
  await conn.query(`
    CREATE TABLE IF NOT EXISTS monthly_invoice_staff_signatures (
      id CHAR(36) PRIMARY KEY,
      resort_id CHAR(36) NOT NULL,
      period_start DATE NOT NULL,
      signature_data_url MEDIUMTEXT NOT NULL,
      signer_id CHAR(36) NOT NULL,
      signer_name VARCHAR(200) NOT NULL,
      signed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      CONSTRAINT fk_monthly_invoice_staff_signature_resort FOREIGN KEY (resort_id) REFERENCES resorts(id) ON DELETE RESTRICT,
      CONSTRAINT fk_monthly_invoice_staff_signature_signer FOREIGN KEY (signer_id) REFERENCES users(id) ON DELETE RESTRICT,
      UNIQUE KEY uq_monthly_invoice_staff_signature_period (resort_id, period_start),
      INDEX idx_monthly_invoice_staff_signatures_period (period_start, signed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `);
  console.log('038: monthly_invoice_staff_signatures created.');

  // Verification queries
  console.log('\n--- Verification ---');
  const [finalCols] = await conn.query('SHOW COLUMNS FROM invoices');
  console.log('Invoices columns:', finalCols.map(c => c.Field));

  const [subCount] = await conn.query('SELECT count(*) as count FROM monthly_invoice_submissions');
  console.log('monthly_invoice_submissions row count:', subCount[0].count);

  const [itemsCount] = await conn.query('SELECT count(*) as count FROM monthly_invoice_submission_items');
  console.log('monthly_invoice_submission_items row count:', itemsCount[0].count);

  const [sigCount] = await conn.query('SELECT count(*) as count FROM monthly_invoice_staff_signatures');
  console.log('monthly_invoice_staff_signatures row count:', sigCount[0].count);

  await conn.end();
  console.log('\n✅ All migrations applied and verified successfully on TiDB!');
}

run().catch(err => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
