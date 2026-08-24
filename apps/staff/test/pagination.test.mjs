import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('booking tables use compact icon pagination', async () => {
  const [staff, admin] = await Promise.all([
    read('../src/components/StaffBookingsClient.jsx'),
    read('../../admin/src/app/dashboard/admin/bookings/page.js'),
  ]);

  for (const icon of ['«', '‹', '›', '»']) assert.match(staff, new RegExp(icon));
  assert.doesNotMatch(staff, />\{t\('common_(?:first|previous|next|last)'\)\}<\/button>/);
  assert.match(staff, /aria-current="page"/);

  for (const icon of ['ChevronsLeft', 'ChevronLeft', 'ChevronRight', 'ChevronsRight']) {
    assert.match(admin, new RegExp(`<${icon}`));
  }
});
