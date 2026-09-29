import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { normalizeLocationResult, worldTimezones } from '../src/lib/resort-location.js';
import { searchResortLocations } from '../src/lib/resort-geocoding.js';

const read = (value) => readFile(fileURLToPath(new URL(value, import.meta.url)), 'utf8');

test('resort form offers the world IANA timezone list', () => {
  const timezones = worldTimezones();

  assert.ok(timezones.length > 400);
  assert.ok(timezones.includes('Asia/Kuala_Lumpur'));
  assert.ok(timezones.includes('America/New_York'));
  assert.ok(timezones.includes('Indian/Maldives'));
  assert.equal(new Set(timezones).size, timezones.length);
});

test('resort form searches and applies a location while keeping fields editable', async () => {
  const page = await read('../src/app/dashboard/admin/resorts/page.js');

  assert.match(page, /worldTimezones\(\)/);
  assert.match(page, /\/api\/locations\?q=/);
  assert.match(page, /setFormData\(\(current\)[\s\S]*?latitude: result\.latitude[\s\S]*?timezone: result\.timezone/);
  assert.match(page, /role="combobox"/);
  assert.match(page, /className="resort-timezone-menu"/);
  assert.doesNotMatch(page, /<datalist id="resort-timezones">/);
  assert.match(page, /OpenStreetMap contributors/);
  assert.doesNotMatch(page, /const TIMEZONES = \[\s*'Indian\/Maldives'/);
});

test('location search returns coordinates and the local timezone', async () => {
  const results = await searchResortLocations('Kuala Lumpur hotel', async (url, options) => {
    assert.match(String(url), /q=Kuala\+Lumpur\+hotel/);
    assert.equal(options.next.revalidate, 86400);
    return Response.json([{
      display_name: 'Kuala Lumpur, Malaysia',
      lat: '3.1516964',
      lon: '101.6942371',
      address: { city: 'Kuala Lumpur', country: 'Malaysia' },
    }]);
  });

  assert.equal(results[0].timezone, 'Asia/Kuala_Lumpur');
  assert.equal(results[0].latitude, 3.151696);
  assert.equal(results[0].longitude, 101.694237);
});

test('geocoding result becomes editable resort location fields', () => {
  assert.deepEqual(normalizeLocationResult({
    display_name: 'Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia',
    lat: '3.1516964',
    lon: '101.6942371',
    address: { city: 'Kuala Lumpur', state: 'Kuala Lumpur', country: 'Malaysia' },
  }, 'Asia/Kuala_Lumpur'), {
    label: 'Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia',
    location: 'Kuala Lumpur, Malaysia',
    latitude: 3.151696,
    longitude: 101.694237,
    timezone: 'Asia/Kuala_Lumpur',
  });
});
