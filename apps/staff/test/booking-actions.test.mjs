import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('internal booking actions use one compact accessible menu without removing actions', async () => {
  const source = await read('../src/components/StaffBookingsClient.jsx');

  assert.match(source, /<details[\s\S]*?className="booking-action-menu"/);
  assert.match(source, /<summary[\s\S]*aria-label=/);
  assert.match(source, /className="booking-action-trigger-icon"/);
  assert.match(source, /className="booking-action-trigger-label"/);
  assert.match(source, /className="booking-action-trigger-chevron"/);
  assert.match(source, /className="booking-action-dropdown"/);
  for (const action of [
    'booking_view',
    'booking_edit',
    'booking_complete',
    'booking_reschedule',
    'booking_cancel_guest',
    'booking_cancel_weather',
    'common_signed',
    'booking_delete',
  ]) assert.match(source, new RegExp(action));
  assert.doesNotMatch(source, /minWidth:\s*160/);
});

test('internal booking management uses accessible dialogs and real API mutations', async () => {
  const source = await read('../src/components/StaffBookingsClient.jsx');
  const styles = await read('../src/app/globals.css');
  const route = await read('../src/app/api/bookings/[id]/route.js');

  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /className="modal staff-manage-booking-modal"/);
  assert.match(source, />&times;<\/button>/);
  assert.match(styles, /\.staff-booking-backdrop\s*\{[\s\S]*?align-items:\s*center/);
  assert.match(styles, /\.staff-manage-booking-modal\s*\{[\s\S]*?max-height:\s*calc\(100dvh - 48px\)/);
  assert.match(source, /method:\s*type === 'schedule' \? 'POST' : 'DELETE'/);
  assert.match(source, /reschedule[\s\S]*?method:\s*type === 'schedule' \? 'POST'/);
  assert.doesNotMatch(source, /window\.prompt/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /requireUser\(\['internal'\]\)/);
  assert.match(route, /canManageBooking\(user, before\)/);
  assert.match(route, /action:\s*'booking\.delete'/);
});

test('pending bookings expose approve and reject as direct review actions', async () => {
  const source = await read('../src/components/StaffBookingsClient.jsx');

  assert.match(source, /booking\.status === 'pending'[\s\S]*?className="booking-review-actions"/);
  assert.match(source, /className="booking-review-button is-accept"[\s\S]*?type: 'accept'/);
  assert.match(source, /className="booking-review-button is-reject"[\s\S]*?type: 'reject'/);
});

test('booking action menu stays narrow and overlays the table instead of widening it', async () => {
  const styles = await read('../src/app/globals.css');

  assert.match(styles, /\.booking-action-column\s*\{[\s\S]*?width:\s*150px/);
  assert.match(styles, /\.booking-action-menu summary\s*\{[\s\S]*?width:\s*118px/);
  assert.match(styles, /\.booking-action-menu summary\s*\{[\s\S]*?border-radius:\s*9px/);
  assert.match(styles, /\.booking-action-menu\[open\] summary[\s\S]*?border-color:\s*var\(--cyan\)/);
  assert.match(styles, /\.booking-action-menu\[open\]\s*\{[\s\S]*?z-index:\s*50/);
  assert.match(styles, /\.booking-action-dropdown\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(styles, /\.booking-action-dropdown\s*\{[\s\S]*?right:\s*0/);
});

test('booking detail hero keeps readable dark-theme contrast', async () => {
  const styles = await read('../src/app/globals.css');
  const hero = styles.match(/\.family-view-hero\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(hero, /background:\s*transparent/);
  assert.doesNotMatch(hero, /#ffffff|#f4efff|#fff7ed/i);
  assert.match(styles, /\.family-view-hero h2\s*\{[\s\S]*?color:\s*var\(--text-primary\)/);
  assert.match(styles, /\.family-view-hero p\s*\{[\s\S]*?color:\s*var\(--text-secondary\)/);
});

test('booking form sections use the dark dashboard surface', async () => {
  const styles = await read('../src/app/globals.css');
  const section = styles.match(/\.booking-form-section\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(section, /background:\s*var\(--bg-card\)/);
  assert.doesNotMatch(section, /rgba\(255,\s*255,\s*255/);
});
