import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const path = (value) => fileURLToPath(new URL(value, import.meta.url));
const read = (value) => readFile(path(value), 'utf8');

test('Sky Guide UI belongs only to staff internal', async () => {
  const [page, sidebar, header, proxy] = await Promise.all([
    read('../src/app/dashboard/internal/sky-events/page.js'),
    read('../src/components/StaffSidebar.jsx'),
    read('../src/components/StaffHeader.jsx'),
    read('../src/proxy.js'),
  ]);

  assert.match(page, /Sky Guide Hub/);
  assert.match(sidebar, /isInternal[\s\S]*\/sky-events/);
  assert.match(header, /sky-events[\s\S]*Sky Guide/);
  assert.match(proxy, /\/dashboard\/internal\/sky-events/);
  await assert.rejects(access(path('../../admin/src/app/dashboard/admin/sky-events/page.js'), constants.F_OK));
});

test('Sky Guide write APIs require staff internal and no longer exist in admin', async () => {
  const [events, event, settings] = await Promise.all([
    read('../src/app/api/sky-events/route.js'),
    read('../src/app/api/sky-events/[id]/route.js'),
    read('../src/app/api/sky-settings/route.js'),
  ]);

  for (const source of [events, event, settings]) {
    assert.match(source, /requirePermission\('staff\.sky_guide', \['internal'\], \{ write: true \}\)/);
    assert.doesNotMatch(source, /requirePermission\([^\n]*\['admin'\]/);
  }
  assert.match(settings, /catch \(error\)[\s\S]*jsonError\(error\)/);
  await Promise.all([
    assert.rejects(access(path('../../admin/src/app/api/sky-events/route.js'), constants.F_OK)),
    assert.rejects(access(path('../../admin/src/app/api/sky-events/[id]/route.js'), constants.F_OK)),
    assert.rejects(access(path('../../admin/src/app/api/sky-settings/route.js'), constants.F_OK)),
  ]);
});

test('database enforces active internal ownership for Sky Guide writes', async () => {
  const [schema, migration] = await Promise.all([
    read('../../../db/schema.sql'),
    read('../../../db/migrations/018_sky_guide_internal_ownership.sql'),
  ]);

  for (const source of [schema, migration]) {
    assert.match(source, /enforce_internal_sky_manager/);
    assert.match(source, /role = 'internal'/);
    assert.match(source, /sky_app_settings[\s\S]*updated_by uuid REFERENCES users\(id\)/);
  }
});

test('Sky Guide event reads and writes are scoped to the staff resort', async () => {
  const [events, event] = await Promise.all([
    read('../src/app/api/sky-events/route.js'),
    read('../src/app/api/sky-events/[id]/route.js'),
  ]);
  assert.match(events, /se\.resort_id = \$1/);
  assert.match(events, /user\.resort_id/);
  assert.match(event, /resort_id = \$2/);
  assert.match(event, /user\.resort_id/);
});
