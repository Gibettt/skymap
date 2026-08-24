import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('presence stream is admin-only and emits SSE from resort-scoped staff data', async () => {
  const route = await read('../src/app/api/presence/stream/route.js');
  assert.match(route, /requireUser\(\['admin'\]\)/);
  assert.match(route, /text\/event-stream/);
  assert.match(route, /u\.role IN \('internal', 'external'\)/);
  assert.match(route, /resort_id/);
});

test('user management consumes realtime presence and supports resort selection', async () => {
  const page = await read('../src/app/dashboard/admin/pengguna/page.js');
  assert.match(page, /new EventSource\('\/api\/presence\/stream'\)/);
  assert.match(page, /selectedResort/);
  assert.match(page, /PresenceBadge/);
});

test('schema and migration persist heartbeat and activity timestamps', async () => {
  const [schema, migration] = await Promise.all([
    read('../../../db/schema.sql'),
    read('../../../db/migrations/020_user_presence.sql'),
  ]);
  for (const source of [schema, migration]) {
    assert.match(source, /last_seen_at timestamptz/);
    assert.match(source, /last_active_at timestamptz/);
  }
});
