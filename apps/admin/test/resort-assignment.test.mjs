import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('only Admin can persist staff resort assignments', async () => {
  const [listRoute, updateRoute] = await Promise.all([
    read('../src/app/api/users/route.js'),
    read('../src/app/api/users/[id]/route.js'),
  ]);
  assert.match(listRoute, /requireUser\(\['admin'\]\)/);
  assert.match(updateRoute, /assertSameOrigin\(request\)/);
  assert.match(updateRoute, /requireUser\(\['admin'\]\)/);
  assert.match(updateRoute, /Staff must be assigned to a resort/);
  assert.match(updateRoute, /writeAudit/);
});
