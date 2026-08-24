import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('admin reschedule uses one accessible application modal instead of browser prompts', async () => {
  const source = await read('../src/app/dashboard/admin/bookings/page.js');

  assert.doesNotMatch(source, /window\.prompt/);
  assert.match(source, /function AdminRescheduleModal/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /type="date"/);
  assert.match(source, /type="time"/);
  assert.match(source, /className="admin-reschedule-error"/);
  assert.match(source, /handleRescheduleSubmit/);
});

test('admin reschedule modal is responsive and uses the existing dashboard theme', async () => {
  const styles = await read('../src/app/globals.css');

  assert.match(styles, /\.admin-reschedule-modal\s*\{[\s\S]*?background:\s*var\(--bg-card\)/);
  assert.match(styles, /\.admin-reschedule-form-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/);
  assert.match(styles, /@media \(max-width:\s*600px\)[\s\S]*?\.admin-reschedule-form-grid[\s\S]*?grid-template-columns:\s*1fr/);
});
