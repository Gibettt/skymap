import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('staff heartbeat is authenticated, same-origin, and parameterized', async () => {
  const route = await read('../src/app/api/presence/route.js');
  assert.match(route, /assertSameOrigin\(request\)/);
  assert.match(route, /requireUser\(\['internal', 'external'\]\)/);
  assert.match(route, /last_seen_at = now\(\)/);
  assert.match(route, /WHERE id = \$1/);
});

test('staff dashboards mount one shared heartbeat client', async () => {
  const [wrapper, presence] = await Promise.all([
    read('../src/components/ClientWrapper.jsx'),
    read('../src/components/StaffPresence.jsx'),
  ]);
  assert.match(wrapper, /<StaffPresence \/>/);
  assert.match(presence, /25_000/);
  assert.match(presence, /visibilitychange/);
});
