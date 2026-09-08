import assert from 'node:assert/strict';
import test from 'node:test';

import { mysqlQuery } from '../mysql-adapter.js';

test('DELETE RETURNING respects every WHERE scope predicate', async () => {
  const calls = [];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT *')) return [[], []];
      if (sql.startsWith('DELETE')) return [{ affectedRows: 0 }, []];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await mysqlQuery(
    executor,
    'DELETE FROM sky_events WHERE id = $1 AND resort_id = $2 RETURNING *',
    ['event-one', 'resort-two'],
  );

  assert.equal(result.rowCount, 0);
  assert.deepEqual(result.rows, []);
  assert.match(calls[0].sql, /WHERE id = \? AND resort_id = \? FOR UPDATE$/);
  assert.deepEqual(calls[0].params, ['event-one', 'resort-two']);
});

test('DELETE RETURNING returns only rows actually deleted', async () => {
  const row = { id: 'event-one', resort_id: 'resort-one' };
  const executor = {
    async query(sql) {
      if (sql.startsWith('SELECT *')) return [[row], []];
      if (sql.startsWith('DELETE')) return [{ affectedRows: 1 }, []];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await mysqlQuery(
    executor,
    'DELETE FROM sky_events WHERE id = $1 AND resort_id = $2 RETURNING *',
    ['event-one', 'resort-one'],
  );

  assert.equal(result.rowCount, 1);
  assert.deepEqual(result.rows, [row]);
});

test('UPDATE RETURNING supports recipient-scoped array predicates', async () => {
  const calls = [];
  const returned = [{ id: 'notification-one', read_at: '2026-08-28T00:00:00.000Z' }];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT id FROM `notifications`')) return [[{ id: 'notification-one' }], []];
      if (sql.startsWith('UPDATE')) return [{ affectedRows: 1 }, []];
      if (sql.startsWith('SELECT id, read_at')) return [returned, []];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await mysqlQuery(
    executor,
    `UPDATE notifications
     SET read_at = COALESCE(read_at, now())
     WHERE recipient_user_id = $1 AND id = ANY($2::uuid[])
     RETURNING id, read_at`,
    ['user-one', ['notification-one']],
  );

  assert.equal(result.rowCount, 1);
  assert.deepEqual(result.rows, returned);
  assert.match(calls[0].sql, /recipient_user_id = \? AND id IN \(\?\) FOR UPDATE$/);
  assert.deepEqual(calls[0].params, ['user-one', ['notification-one']]);
  assert.deepEqual(calls[2].params, ['notification-one']);
});

test('UPDATE RETURNING supports predicates without a direct id comparison', async () => {
  const returned = [
    { id: 'notification-one', read_at: '2026-08-28T00:00:00.000Z' },
    { id: 'notification-two', read_at: '2026-08-28T00:00:00.000Z' },
  ];
  const executor = {
    async query(sql) {
      if (sql.startsWith('SELECT id FROM `notifications`')) {
        return [[{ id: 'notification-one' }, { id: 'notification-two' }], []];
      }
      if (sql.startsWith('UPDATE')) return [{ affectedRows: 2 }, []];
      if (sql.startsWith('SELECT id, read_at')) return [returned, []];
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await mysqlQuery(
    executor,
    `UPDATE notifications SET read_at = COALESCE(read_at, now())
     WHERE recipient_user_id = $1 AND read_at IS NULL
     RETURNING id, read_at`,
    ['user-one'],
  );

  assert.equal(result.rowCount, 2);
  assert.deepEqual(result.rows, returned);
});
