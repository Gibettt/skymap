import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const path = (value) => fileURLToPath(new URL(value, import.meta.url));
const read = (value) => readFile(path(value), 'utf8');

test('admin portal has an active proxy that only lets admin sessions through', async () => {
  const proxy = await read('../src/proxy.ts');

  assert.match(proxy, /export function proxy/);
  assert.match(proxy, /readSessionValue/);
  assert.match(proxy, /session\.role !== "admin"/);
  assert.match(proxy, /matcher: \["\/dashboard\/:path\*", "\/api\/\(\(\?!auth\/\)\.\+\)"\]/);
  await assert.rejects(access(path('../src/proxy.disabled.ts')));
});

test('every dashboard page, including template screens, requires an admin user', async () => {
  const layout = await read('../src/app/(main)/dashboard/layout.tsx');

  assert.match(layout, /sessionUser\?\.role !== "admin"\) redirect\("\/login"\)/);
});

test('package PATCH writes only columns that its patch object defines', async () => {
  const route = await read('../src/app/api/packages/[id]/route.js');
  const used = [...route.matchAll(/\bpatch\.(\w+)/g)].map((match) => match[1]);

  assert.ok(used.length > 0);
  for (const column of new Set(used)) {
    assert.match(route, new RegExp(`^\\s+${column}:`, 'm'), `patch.${column} is used but never defined`);
  }
  assert.match(route, /child_age_range: body\.childAgeRange === undefined \? before\.rows\[0\]\.child_age_range/);
});
