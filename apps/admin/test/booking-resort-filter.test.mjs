import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('admin booking list filters created resorts and summarizes booking source', async () => {
  const page = await read('../src/app/dashboard/admin/bookings/page.js');
  const route = await read('../src/app/api/bookings/route.js');

  assert.match(page, /useResortsQuery/);
  assert.match(page, /selectedResort/);
  assert.match(page, /Semua resort/);
  assert.match(page, /Booking Internal/);
  assert.match(page, /Booking External/);
  assert.match(route, /searchParams\.get\('resortId'\)/);
  assert.match(route, /uuidSchema\.safeParse/);
  assert.match(route, /b\.resort_id =/);
});

test('admin delete button calls the booking DELETE endpoint', async () => {
  const page = await read('../src/app/dashboard/admin/bookings/page.js');
  const route = await read('../src/app/api/bookings/[id]/route.js');

  assert.match(page, /method:\s*'DELETE'/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /action:\s*'booking\.delete'/);
});
