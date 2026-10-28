import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('external staff can open the resort event calendar from the sidebar', async () => {
  const [sidebar, proxy, page] = await Promise.all([
    read('../src/navigation/sidebar/sidebar-items.ts'),
    read('../src/proxy.ts'),
    read('../src/app/(main)/dashboard/[role]/sky-events/page.tsx'),
  ]);

  assert.doesNotMatch(sidebar, /role === "internal" && can\("staff\.sky_guide"\)/);
  assert.doesNotMatch(proxy, /external\/sky-events/);
  assert.match(page, /readOnly=\{context\.readOnly \|\| context\.role === "external"\}/);
});

test('external staff only read published events; every write stays internal-only', async () => {
  const routes = await Promise.all([
    read('../src/app/api/sky-events/route.js'),
    read('../src/app/api/sky-events/[id]/route.js'),
    read('../src/app/api/sky-events/[id]/image/route.js'),
    read('../src/app/api/sky-event-types/route.js'),
    read('../src/app/api/sky-settings/route.js'),
  ]);

  assert.match(routes[0], /user\.role === "external" \? "AND se\.status = 'published' AND se\.is_published = true"/);
  for (const route of routes) {
    for (const [call] of route.matchAll(/requirePermission\([^)]*\{ write: true \}\)/g)) {
      assert.match(call, /\[["']internal["']\]/, call);
    }
  }
});
