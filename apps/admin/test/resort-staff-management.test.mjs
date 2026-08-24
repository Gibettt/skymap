import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('admin can create a resort staff account without exposing its password hash', async () => {
  const route = await read('../src/app/api/users/route.js');

  assert.match(route, /export async function POST/);
  assert.match(route, /assertSameOrigin\(request\)/);
  assert.match(route, /requireUser\(\['admin'\]\)/);
  assert.match(route, /createStaffSchema/);
  assert.match(route, /hashPassword/);
  assert.match(route, /writeAudit/);
  assert.doesNotMatch(route, /RETURNING \*/);
});

test('resort page manages staff and keeps activation coverage-gated', async () => {
  const page = await read('../src/app/dashboard/admin/resorts/page.js');

  assert.match(page, /Kelola Staff/);
  assert.match(page, /StaffManagementModal/);
  assert.match(page, /Buat akun staff baru/);
  assert.match(page, /Tetapkan/);
  assert.match(page, /disabled=\{r\.status !== 'active' && !hasStaffCoverage\(r\)\}/);
});

test('staff management modal uses an accessible responsive layout', async () => {
  const [page, styles] = await Promise.all([
    read('../src/app/dashboard/admin/resorts/page.js'),
    read('../src/app/globals.css'),
  ]);

  assert.match(page, /className="resort-staff-modal"/);
  assert.match(page, /className="resort-staff-role-grid"/);
  assert.match(page, /className="resort-staff-create-grid"/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /event\.key === 'Escape'/);
  assert.match(styles, /\.resort-staff-modal/);
  assert.match(styles, /@media \(max-width: 720px\)/);
});
