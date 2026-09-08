import { Pool } from 'pg';
import mysql from 'mysql2/promise';
import { mysqlQuery } from './mysql-adapter.js';

let pool;
let poolDialect;

export function getDatabaseDialect() {
  const databaseUrl = process.env.DATABASE_URL || '';
  return databaseUrl.startsWith('mysql://') || databaseUrl.startsWith('mysql2://') ? 'mysql' : 'postgres';
}

export function isMySql() {
  return getDatabaseDialect() === 'mysql';
}

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!pool) {
    poolDialect = getDatabaseDialect();
    if (poolDialect === 'mysql') {
      const databaseUrl = new URL(process.env.DATABASE_URL);
      pool = mysql.createPool({
        host: databaseUrl.hostname,
        port: Number(databaseUrl.port || 3306),
        user: decodeURIComponent(databaseUrl.username),
        password: decodeURIComponent(databaseUrl.password),
        database: databaseUrl.pathname.replace(/^\//, ''),
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_POOL_MAX || '5', 10),
        connectTimeout: 5000,
        timezone: 'Z',
        dateStrings: ['DATE'],
        supportBigNumbers: true,
        bigNumberStrings: true,
        ssl: process.env.DATABASE_SSL === 'true' ? {} : undefined,
        typeCast(field, next) {
          if (field.type === 'TINY' && field.length === 1) return field.string() === '1';
          return next();
        },
      });
    } else {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true'
          ? { rejectUnauthorized: process.env.NODE_ENV === 'production' }
          : false,
        max: parseInt(process.env.DB_POOL_MAX || '5', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }
  }

  return pool;
}

export async function query(text, params = []) {
  const activePool = getPool();
  return poolDialect === 'mysql' ? mysqlQuery(activePool, text, params) : activePool.query(text, params);
}

export async function transaction(work) {
  const activePool = getPool();
  const client = await activePool.connect ? await activePool.connect() : await activePool.getConnection();
  try {
    if (poolDialect === 'mysql') await client.beginTransaction();
    else await client.query('BEGIN');

    const transactionClient = poolDialect === 'mysql'
      ? { query: (text, params = []) => mysqlQuery(client, text, params) }
      : client;
    const result = await work(transactionClient);

    if (poolDialect === 'mysql') await client.commit();
    else await client.query('COMMIT');
    return result;
  } catch (error) {
    if (poolDialect === 'mysql') await client.rollback();
    else await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// CQRS Read Models re-export
export {
  getDashboardKPI,
  getStaffPerformance,
  getResortAnalytics,
  getMonthlyRevenue,
  getBookingPipeline,
  refreshMaterializedViews,
  refreshMaterializedView,
} from './read-models.js';

// CQRS Command Side Effects re-export
export {
  refreshAfterBookingChange,
  refreshAfterPayoutChange,
  refreshAfterResortChange,
} from './commands.js';
