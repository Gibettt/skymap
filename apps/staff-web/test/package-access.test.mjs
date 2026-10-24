import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

const guardedRoutes = [
  '../src/app/api/packages/route.js',
  '../src/app/api/packages/[id]/route.js',
  '../src/app/api/package-types/route.js',
  '../src/app/api/inventory/route.js',
  '../src/app/api/inventory/[id]/route.js',
];

test('package, package-type and inventory routes enforce RBAC permissions, not just a role', async () => {
  for (const file of guardedRoutes) {
    const route = await read(file);
    assert.doesNotMatch(route, /requireUser/, `${file} still uses requireUser`);
    assert.match(route, /requirePermission\(["']staff\.bookings["']/, `${file} has no permission check`);
  }
});

test('only internal staff can write packages, package types and inventory', async () => {
  for (const file of guardedRoutes) {
    const route = await read(file);
    const writes = [...route.matchAll(/requirePermission\([^)]*\{ write: true \}\)/g)];
    assert.ok(writes.length > 0, `${file} has no write guard`);
    for (const [call] of writes) assert.match(call, /\[["']internal["']\]/, `${file}: ${call}`);
  }
});

test('internal staff cannot create a package for another resort', async () => {
  const route = await read('../src/app/api/packages/route.js');

  assert.match(route, /requestData\.fields\.resortId = user\.resort_id;/);
  assert.doesNotMatch(route, /!requestData\.fields\.resortId/);
});

test('internal staff cannot move a package to another resort', async () => {
  const route = await read('../src/app/api/packages/[id]/route.js');

  assert.match(route, /body\.resortId !== undefined && body\.resortId !== user\.resort_id/);
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
