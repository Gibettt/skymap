import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!pool) {
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

  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function transaction(work) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
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
