import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('resort API reports role coverage and open booking totals', async () => {
  const route = await read('../src/app/api/resorts/route.js');
  assert.match(route, /active_internal_count/);
  assert.match(route, /active_external_count/);
  assert.match(route, /active_package_count/);
  assert.match(route, /open_bookings_count/);
  assert.match(route, /coverage_status/);
});

test('resort activation and deactivation enforce operational readiness', async () => {
  const route = await read('../src/app/api/resorts/[id]/route.js');
  assert.match(route, /Resort membutuhkan minimal 1 staff Internal dan 1 staff External aktif/);
  assert.match(route, /minimal 1 package aktif/);
  assert.match(route, /Resort masih memiliki booking terbuka/);
  assert.match(route, /FOR UPDATE/);
});

test('user assignment protects the last covered staff member', async () => {
  const route = await read('../src/app/api/users/[id]/route.js');
  assert.match(route, /coverageRoleRemoved/);
  assert.match(route, /Staff terakhir tidak dapat dipindahkan atau dinonaktifkan/);
  assert.match(route, /FOR UPDATE/);
});

test('admin resort page renders Internal and External coverage separately', async () => {
  const page = await read('../src/app/dashboard/admin/resorts/page.js');
  assert.match(page, /active_internal_count/);
  assert.match(page, /active_external_count/);
  assert.match(page, /active_package_count/);
  assert.match(page, /Coverage Ready/);
  assert.match(page, /Butuh Staff/);
  assert.match(page, /Butuh Package/);
});

test('inactive resorts cannot be used through the staff portal', async () => {
  const [auth, login] = await Promise.all([
    read('../../../packages/auth/index.js'),
    read('../../../packages/auth/handlers.js'),
  ]);
  assert.match(auth, /resort_status/);
  assert.match(auth, /user\.resort_status !== 'active'/);
  assert.match(login, /user\.resort_status !== 'active'/);
});

test('database keeps a resort coverage read model and transition guards', async () => {
  const [schema, staffMigration, packageMigration] = await Promise.all([
    read('../../../db/schema.sql'),
    read('../../../db/migrations/021_resort_staff_coverage.sql'),
    read('../../../db/migrations/022_resort_package_readiness.sql'),
  ]);
  for (const sql of [schema, staffMigration]) {
    assert.match(sql, /resort_staff_coverage/);
    assert.match(sql, /enforce_resort_operational_transition/);
    assert.match(sql, /enforce_last_resort_staff_coverage/);
  }
  for (const sql of [schema, packageMigration]) {
    assert.match(sql, /active_package_count/);
    assert.match(sql, /is_chargeable = \(adult_price_usd > 0 OR COALESCE\(child_price_usd, 0\) > 0\)/);
    assert.match(sql, /enforce_last_active_resort_package/);
  }
});
