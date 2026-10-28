import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('only external staff can save a rating, and only through the shared rule', async () => {
  const route = await read('../src/app/api/bookings/[id]/review/route.js');

  assert.match(route, /assertSameOrigin\(request\)/);
  assert.match(route, /requirePermission\("staff\.bookings", \["external"\], \{ write: true \}\)/);
  assert.match(route, /staffReviewError\(user, booking\)/);
  assert.match(route, /FOR UPDATE/);
  assert.match(route, /writeAudit/);
});

test('booking lists carry the staff review so the menu and details can show it', async () => {
  const [list, page] = await Promise.all([
    read('../src/app/api/bookings/route.js'),
    read('../src/app/(main)/dashboard/[role]/bookings/_components/staff-bookings.tsx'),
  ]);

  assert.match(list, /attachStaffReviews\(\{ query \}, rows\)/);
  assert.match(page, /role === "external" && !readOnly && booking\.status === "completed"/);
  assert.match(page, /<StaffReviewDialog/);
});
