import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('Sky Guide (calculated astronomy) and Upcoming Events (resort sessions) are separate menus', async () => {
  const [sidebar, events] = await Promise.all([
    read('../src/navigation/sidebar/sidebar-items.ts'),
    read('../src/app/(main)/dashboard/[role]/sky-events/_components/sky-events.tsx'),
  ]);

  assert.match(sidebar, /title: "Sky Guide", url: `\$\{basePath\}\/sky-guide`/);
  assert.match(sidebar, /title: "Upcoming Events", url: `\$\{basePath\}\/sky-events`/);
  assert.match(events, />Upcoming Events</);
});

test('both staff roles can read the Sky Guide for their own resort', async () => {
  const [route, page] = await Promise.all([
    read('../src/app/api/sky-guide/route.js'),
    read('../src/app/(main)/dashboard/[role]/sky-guide/page.tsx'),
  ]);

  assert.match(route, /requirePermission\("staff\.sky_guide", \["internal", "external"\]\)/);
  assert.match(route, /WHERE id = \$1", \[\s*user\.resort_id/);
  assert.match(route, /skyGuide\(/);
  assert.match(page, /requireStaffContext\(role, "staff\.sky_guide"\)/);
});
