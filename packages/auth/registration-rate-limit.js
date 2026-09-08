import crypto from 'node:crypto';

import { isMySql, query, transaction } from '@ephemeris/db';

import { resolveClientIp } from './audit.js';
import { ApiError } from './errors.js';

const REGISTRATION_WINDOW_MINUTES = 60;
const REGISTRATION_LIMITS = Object.freeze({
  email: 5,
  ip: 20,
  unresolved_ip: 8,
});
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 200;

let registrationRateTableReady = false;
let lastCleanupAt = 0;

function registrationKey(scope, value) {
  return crypto.createHash('sha256').update(`${scope}:${String(value).trim().toLowerCase()}`).digest('hex');
}

async function ensureRegistrationRateTable() {
  if (registrationRateTableReady) return;

  if (isMySql()) {
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limit_registration (
        scope VARCHAR(32) NOT NULL,
        key_hash CHAR(64) NOT NULL,
        window_started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        attempts INT NOT NULL DEFAULT 0,
        PRIMARY KEY (scope, key_hash),
        INDEX idx_rate_limit_registration_window (window_started_at)
      )
    `);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS rate_limit_registration (
        scope varchar(32) NOT NULL,
        key_hash char(64) NOT NULL,
        window_started_at timestamptz NOT NULL DEFAULT now(),
        attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
        PRIMARY KEY (scope, key_hash)
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_rate_limit_registration_window
      ON rate_limit_registration(window_started_at)
    `);
  }

  registrationRateTableReady = true;
}

async function cleanupExpiredRegistrationLimits() {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;

  if (isMySql()) {
    await query(`
      DELETE FROM rate_limit_registration
      WHERE window_started_at < now() - interval '24 hours'
      ORDER BY window_started_at
      LIMIT ${CLEANUP_BATCH_SIZE}
    `);
  } else {
    await query(`
      DELETE FROM rate_limit_registration
      WHERE (scope, key_hash) IN (
        SELECT scope, key_hash
        FROM rate_limit_registration
        WHERE window_started_at < now() - interval '24 hours'
        ORDER BY window_started_at
        LIMIT ${CLEANUP_BATCH_SIZE}
      )
    `);
  }

  lastCleanupAt = now;
}

async function consumeLimit(client, scope, value, limit) {
  const { rows } = await client.query(
    `INSERT INTO rate_limit_registration (scope, key_hash, window_started_at, attempts)
     VALUES ($1, $2, now(), 1)
     ON CONFLICT (scope, key_hash) DO UPDATE SET
       attempts = CASE
         WHEN rate_limit_registration.window_started_at < now() - interval '${REGISTRATION_WINDOW_MINUTES} minutes'
           THEN 1
         ELSE rate_limit_registration.attempts + 1
       END,
       window_started_at = CASE
         WHEN rate_limit_registration.window_started_at < now() - interval '${REGISTRATION_WINDOW_MINUTES} minutes'
           THEN now()
         ELSE rate_limit_registration.window_started_at
       END
     RETURNING attempts, window_started_at`,
    [scope, registrationKey(scope, value)],
  );

  if (Number(rows[0]?.attempts || 0) > limit) {
    throw new ApiError(429, 'Too many registration attempts. Please try again later.');
  }
}

export async function enforceRegistrationRateLimit(request, email) {
  await ensureRegistrationRateTable();
  await cleanupExpiredRegistrationLimits();

  const clientIp = resolveClientIp(request);
  await transaction(async (client) => {
    await consumeLimit(client, 'email', email, REGISTRATION_LIMITS.email);
    await consumeLimit(
      client,
      clientIp ? 'ip' : 'unresolved_ip',
      clientIp || 'unresolved',
      clientIp ? REGISTRATION_LIMITS.ip : REGISTRATION_LIMITS.unresolved_ip,
    );
  });
}

export { registrationKey, REGISTRATION_LIMITS, REGISTRATION_WINDOW_MINUTES };
