import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const paths = {
  context: fileURLToPath(new URL('../src/context/LanguageContext.jsx', import.meta.url)),
  payout: fileURLToPath(new URL('../src/app/dashboard/external/payout/page.js', import.meta.url)),
  instruments: fileURLToPath(new URL('../src/app/dashboard/external/instruments/page.js', import.meta.url)),
  reports: fileURLToPath(new URL('../src/app/dashboard/external/reports/page.js', import.meta.url)),
  users: fileURLToPath(new URL('../src/app/dashboard/external/users/page.js', import.meta.url)),
  bookings: fileURLToPath(new URL('../src/components/StaffBookingsClient.jsx', import.meta.url)),
};

test('all standalone staff pages use the shared language context', async () => {
  for (const key of ['payout', 'instruments', 'reports', 'users']) {
    const source = await readFile(paths[key], 'utf8');
    assert.match(source, /useLanguage/);
  }
});

test('staff payout and booking actions no longer contain Indonesian-only UI', async () => {
  const [payout, bookings] = await Promise.all([
    readFile(paths.payout, 'utf8'),
    readFile(paths.bookings, 'utf8'),
  ]);

  assert.doesNotMatch(payout, />Progress bintang bulanan</);
  assert.doesNotMatch(payout, />Belum ada request payout\.</);
  assert.doesNotMatch(bookings, /window\.prompt\('Tanggal baru/);
  assert.doesNotMatch(bookings, /showToast\('Booking berhasil dijadwalkan ulang\.'/);
});

test('staff dictionaries contain matching Indonesian and English coverage keys', async () => {
  const source = await readFile(paths.context, 'utf8');
  for (const key of ['payout_title', 'payout_history', 'instruments_desc', 'reports_unavailable', 'reschedule_reason', 'api_error_invalid_booking']) {
    assert.equal(source.match(new RegExp(`${key}:`, 'g'))?.length, 2, `Expected id/en values for ${key}`);
  }

  const idBlock = source.match(/id:\s*\{([\s\S]*?)\n\s*\},\n\s*en:\s*\{/)[1];
  const enBlock = source.match(/en:\s*\{([\s\S]*?)\n\s*\},\n\};/)[1];
  const keys = (block) => [...block.matchAll(/^\s{4}([A-Za-z0-9_]+):/gm)].map((match) => match[1]);
  assert.deepEqual([...new Set(keys(idBlock))].sort(), [...new Set(keys(enBlock))].sort());
});

test('API errors shown by staff pages pass through the active language', async () => {
  const [context, payout, bookings] = await Promise.all([
    readFile(paths.context, 'utf8'),
    readFile(paths.payout, 'utf8'),
    readFile(paths.bookings, 'utf8'),
  ]);

  assert.match(context, /const localizeApiError/);
  assert.match(payout, /localizeApiError\(data\.error/);
  assert.match(bookings, /localizeApiError\(data\.error/);
});
