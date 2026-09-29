import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const path = (value) => fileURLToPath(new URL(value, import.meta.url));
const read = (value) => readFile(path(value), 'utf8');

test('Sky Guide management remains available to staff internal', async () => {
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
  await access(path('../../admin/src/app/dashboard/admin/sky-events/page.js'));
});

test('staff Sky Guide write APIs remain restricted to staff internal', async () => {
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
});

test('database allows active admins or resort internal staff to manage Sky Events', async () => {
  const [schema, migration] = await Promise.all([
    read('../../../db/schema.sql'),
    read('../../../db/migrations/023_admin_sky_guide.sql'),
  ]);

  for (const source of [schema, migration]) {
    assert.match(source, /enforce_sky_event_manager/);
    assert.match(source, /manager_role = 'admin'/);
    assert.match(source, /manager_role = 'internal'[\s\S]*manager_resort_id = NEW\.resort_id/);
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

test('staff calendars overlay resort Sky Events and external reads published events only', async () => {
  const [calendar, events] = await Promise.all([
    read('../src/app/dashboard/external/jadwal/page.js'),
    read('../src/app/api/sky-events/route.js'),
  ]);

  assert.match(calendar, /fetch\('\/api\/sky-events/);
  assert.match(calendar, /calendar-sky-event/);
  assert.match(calendar, /Sky Event/);
  assert.match(events, /user\.role === 'external'/);
  assert.match(events, /se\.status = 'published'/);
});
