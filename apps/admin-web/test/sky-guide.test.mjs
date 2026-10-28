import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('admins have a Sky Guide menu guarded by the calendar permission', async () => {
  const [items, sidebar, route] = await Promise.all([
    read('../src/navigation/sidebar/sidebar-items.ts'),
    read('../src/app/(main)/dashboard/_components/sidebar/app-sidebar.tsx'),
    read('../src/app/api/sky-guide/route.js'),
  ]);

  assert.match(items, /title: "Sky Guide", url: "\/dashboard\/admin\/sky-guide"/);
  assert.match(sidebar, /"\/dashboard\/admin\/sky-guide": "admin\.calendar"/);
  assert.match(route, /requirePermission\("admin\.calendar", \["admin"\]\)/);
});
