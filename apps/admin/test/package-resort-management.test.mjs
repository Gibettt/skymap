import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('admin can filter resort packages and request an independent copy', async () => {
  const page = await read('../src/app/dashboard/admin/packages/page.js');

  assert.match(page, /Semua resort/);
  assert.match(page, /selectedResort/);
  assert.match(page, /Salin ke Resort Lain/);
  assert.match(page, /\/api\/packages\/\$\{copyingPackage\.id\}\/copy/);
});

test('copy endpoint is admin-only, validates origin and target, and copies package content', async () => {
  const route = await read('../src/app/api/packages/[id]/copy/route.js');

  assert.match(route, /assertSameOrigin/);
  assert.match(route, /requireUser\(\['admin'\]\)/);
  assert.match(route, /copyPackageSchema\.safeParse/);
  assert.match(route, /INSERT INTO packages/);
  assert.match(route, /INSERT INTO package_inclusions/);
  assert.match(route, /package\.copy/);
  assert.match(route, /23505/);
});

test('package forms derive paid or free status from prices instead of a checkbox', async () => {
  const [createPage, editPage, createApi, updateApi] = await Promise.all([
    read('../src/app/dashboard/admin/packages/new/page.js'),
    read('../src/app/dashboard/admin/packages/[id]/edit/page.js'),
    read('../src/app/api/packages/route.js'),
    read('../src/app/api/packages/[id]/route.js'),
  ]);

  for (const page of [createPage, editPage]) {
    assert.match(page, /Tanpa harga berarti gratis/);
    assert.doesNotMatch(page, /Package berbayar \(komisi & star berlaku\)/);
  }
  for (const api of [createApi, updateApi]) {
    assert.match(api, /packageIsChargeable/);
  }
});
