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
    'booking_complete',
    'booking_reschedule',
    'booking_cancel_guest',
    'booking_cancel_weather',
    'common_signed',
  ]) assert.match(source, new RegExp(action));
  assert.doesNotMatch(source, /minWidth:\s*160/);
});

test('booking action menu stays narrow and overlays the table instead of widening it', async () => {
  const styles = await read('../src/app/globals.css');

  assert.match(styles, /\.booking-action-column\s*\{[\s\S]*?width:\s*106px/);
  assert.match(styles, /\.booking-action-menu summary\s*\{[\s\S]*?width:\s*94px/);
  assert.match(styles, /\.booking-action-menu summary\s*\{[\s\S]*?border-radius:\s*9px/);
  assert.match(styles, /\.booking-action-menu\[open\] summary[\s\S]*?border-color:\s*var\(--cyan\)/);
  assert.match(styles, /\.booking-action-menu\[open\]\s*\{[\s\S]*?z-index:\s*50/);
  assert.match(styles, /\.booking-action-dropdown\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(styles, /\.booking-action-dropdown\s*\{[\s\S]*?right:\s*0/);
});

test('booking form sections use the dark dashboard surface', async () => {
  const styles = await read('../src/app/globals.css');
  const section = styles.match(/\.booking-form-section\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(section, /background:\s*var\(--bg-card\)/);
  assert.doesNotMatch(section, /rgba\(255,\s*255,\s*255/);
});
