import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const path = (value) => fileURLToPath(new URL(value, import.meta.url));
const read = (value) => readFile(path(value), 'utf8');

test('admin Sky Guide manages the shared resort Sky Events', async () => {
  const [page, sidebar, header] = await Promise.all([
    read('../src/app/dashboard/admin/sky-events/page.js'),
    read('../src/components/AdminSidebar.jsx'),
    read('../src/components/AdminHeader.jsx'),
  ]);

  assert.match(page, /Sky Guide Hub/);
  assert.match(page, /\/api\/resorts/);
  assert.match(page, /resortId/);
  assert.match(page, /\/api\/sky-events/);
  assert.match(sidebar, /\/dashboard\/admin\/sky-events/);
  assert.match(header, /\/dashboard\/admin\/sky-events/);
});

test('admin Sky Event APIs enforce admin auth, origin, resort, package, and audit boundaries', async () => {
  const [events, event, settings] = await Promise.all([
    read('../src/app/api/sky-events/route.js'),
    read('../src/app/api/sky-events/[id]/route.js'),
    read('../src/app/api/sky-settings/route.js'),
  ]);

  for (const source of [events, event, settings]) {
    assert.match(source, /requireUser\(\['admin'\]\)/);
    assert.match(source, /assertSameOrigin\(request\)/);
    assert.match(source, /writeAudit/);
  }
  assert.match(events, /resortId/);
  assert.match(events, /resort_id = \$2/);
  assert.match(event, /resort_id = \$2/);
  assert.match(settings, /updateObservationSpotsSchema/);
});

test('admin calendar overlays bookings and Sky Events with a resort filter', async () => {
  const calendar = await read('../src/app/dashboard/admin/jadwal/page.js');

  assert.match(calendar, /fetch\('\/api\/sky-events/);
  assert.match(calendar, /calendar-sky-event/);
  assert.match(calendar, /Sky Event/);
  assert.match(calendar, /selectedResortId/);
});
