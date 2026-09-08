import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Pool as PostgresPool } from 'pg';
import mysql from 'mysql2/promise';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const sourceUrl = process.env.POSTGRES_SOURCE_URL || 'postgres://postgres:postgres@localhost:5432/ephemeris';
const targetUrl = process.env.MYSQL_TARGET_URL || 'mysql://root:mysql@localhost:3306/ephemeris';

if (!/^postgres(?:ql)?:\/\//i.test(sourceUrl)) {
  throw new Error('POSTGRES_SOURCE_URL must point to PostgreSQL.');
}
if (!/^mysql(?:2)?:\/\//i.test(targetUrl)) {
  throw new Error('MYSQL_TARGET_URL must point to MySQL.');
}

const target = new URL(targetUrl);
const targetDatabase = target.pathname.replace(/^\//, '');
if (!targetDatabase) throw new Error('MYSQL_TARGET_URL must include a database name.');

const tableOrder = [
  'access_permissions',
  'resorts',
  'access_roles',
  'users',
  'access_role_permissions',
  'packages',
  'package_inclusions',
  'sky_events',
  'bookings',
  'booking_participants',
  'booking_experiences',
  'booking_reschedule_history',
  'feedback_tokens',
  'feedback_submissions',
  'payout_requests',
  'invoices',
  'notifications',
  'audit_logs',
  'rate_limit_login',
  'sky_app_settings',
  'sky_settings',
  'domain_events',
];

const postgres = new PostgresPool({ connectionString: sourceUrl, max: 2 });
const mysqlConnection = await mysql.createConnection({
  host: target.hostname,
  port: Number(target.port || 3306),
  user: decodeURIComponent(target.username),
  password: decodeURIComponent(target.password),
  database: targetDatabase,
  timezone: 'Z',
  dateStrings: ['DATE'],
  supportBigNumbers: true,
  bigNumberStrings: true,
  multipleStatements: true,
});

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replaceAll('`', '``')}\``;
}

function convertValue(value, targetType) {
  if (value === null || value === undefined) return null;
  if (targetType === 'json' && typeof value !== 'string') return JSON.stringify(value);
  return value;
}

async function sourceTableExists(table) {
  const { rows } = await postgres.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1 AND table_type = 'BASE TABLE'
     ) AS exists`,
    [table],
  );
  return rows[0].exists;
}

async function targetColumns(table) {
  const [rows] = await mysqlConnection.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ?
     ORDER BY ordinal_position`,
    [targetDatabase, table],
  );
  return new Map(rows.map((row) => [row.COLUMN_NAME || row.column_name, row.DATA_TYPE || row.data_type]));
}

async function sourceColumns(table) {
  const { rows } = await postgres.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return rows.map((row) => row.column_name);
}

async function copyTable(table) {
  if (!(await sourceTableExists(table))) return { table, source: 0, target: 0, skipped: true };

  const mysqlColumns = await targetColumns(table);
  if (!mysqlColumns.size) throw new Error(`Target table ${table} does not exist.`);

  const columns = (await sourceColumns(table)).filter((column) => mysqlColumns.has(column));
  const columnSql = columns.map(quoteIdentifier).join(', ');
  const { rows } = await postgres.query(`SELECT ${columns.map((column) => `"${column}"`).join(', ')} FROM "${table}"`);

  if (rows.length) {
    const placeholders = `(${columns.map(() => '?').join(', ')})`;
    const batchSize = 250;
    for (let offset = 0; offset < rows.length; offset += batchSize) {
      const batch = rows.slice(offset, offset + batchSize);
      const values = batch.flatMap((row) => columns.map((column) => convertValue(row[column], mysqlColumns.get(column))));
      await mysqlConnection.query(
        `INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES ${batch.map(() => placeholders).join(', ')}`,
        values,
      );
    }
  }

  const [[countRow]] = await mysqlConnection.query(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)}`);
  return { table, source: rows.length, target: Number(countRow.count), skipped: false };
}

try {
  await postgres.query('SELECT 1');
  await mysqlConnection.query('SELECT 1');

  const schema = await readFile(resolve(scriptDirectory, '..', 'db', 'mysql', 'schema.sql'), 'utf8');
  await mysqlConnection.query(schema);
  await mysqlConnection.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of [...tableOrder].reverse()) {
    await mysqlConnection.query(`DELETE FROM ${quoteIdentifier(table)}`);
  }

  const results = [];
  for (const table of tableOrder) results.push(await copyTable(table));

  for (const table of ['audit_logs', 'booking_reschedule_history', 'domain_events']) {
    const result = results.find((entry) => entry.table === table);
    if (!result || result.skipped) continue;
    const [[maxRow]] = await mysqlConnection.query(`SELECT COALESCE(MAX(id), 0) AS max_id FROM ${quoteIdentifier(table)}`);
    const nextId = Number(maxRow.max_id) + 1;
    await mysqlConnection.query(`ALTER TABLE ${quoteIdentifier(table)} AUTO_INCREMENT = ${nextId}`);
  }

  await mysqlConnection.query('SET FOREIGN_KEY_CHECKS = 1');

  const failures = results.filter((entry) => !entry.skipped && entry.source !== entry.target);
  for (const result of results) {
    const state = result.skipped ? 'source table absent' : `${result.source} row(s)`;
    console.log(`${result.table}: ${state}`);
  }
  if (failures.length) throw new Error(`Row-count mismatch: ${failures.map((entry) => entry.table).join(', ')}`);
  console.log(`Migration complete: PostgreSQL -> MySQL database ${targetDatabase}.`);
} finally {
  try {
    await mysqlConnection.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch {
    // The connection may already be unavailable.
  }
  await Promise.allSettled([postgres.end(), mysqlConnection.end()]);
}
