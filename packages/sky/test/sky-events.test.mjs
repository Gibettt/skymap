import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterPublicEvents,
  normalizeSkyEventInput,
  rollingDateWindow,
  nearestResort,
  validateResortLocation,
} from '../events.js';

test('normalizes an event for storage', () => {
  const event = normalizeSkyEventInput({
    title: '  Malam Pengamatan  ',
    eventType: 'resort',
    startsAt: '2026-08-20T19:00',
    endsAt: '2026-08-20T20:30',
    visibility: 'both',
  });

  assert.equal(event.title, 'Malam Pengamatan');
  assert.equal(event.eventType, 'resort');
  assert.equal(event.isPublished, true);
});

test('rejects event dates that end before they start', () => {
  assert.throws(() => normalizeSkyEventInput({
    title: 'Malam Pengamatan',
    eventType: 'resort',
    startsAt: '2026-08-20T21:00',
    endsAt: '2026-08-20T20:30',
  }), /after the start/);
});

test('returns only published events within the requested dates', () => {
  const events = filterPublicEvents([
    { id: 'one', startsAt: '2026-08-10T12:00:00.000Z', isPublished: true },
    { id: 'two', startsAt: '2026-08-11T12:00:00.000Z', isPublished: false },
    { id: 'three', startsAt: '2026-09-01T12:00:00.000Z', isPublished: true },
  ], '2026-08-01', '2026-08-31');

  assert.deepEqual(events.map((event) => event.id), ['one']);
});

test('uses seven local calendar dates for a resort', () => {
  assert.deepEqual(
    rollingDateWindow('Indian/Maldives', new Date('2026-08-20T20:30:00.000Z')),
    { from: '2026-08-21', to: '2026-08-27' },
  );
});

test('selects the nearest resort from browser coordinates', () => {
  const resorts = [
    { slug: 'west', latitude: 5.2, longitude: 72.9 },
    { slug: 'east', latitude: 5.3, longitude: 73.5 },
  ];
  assert.equal(nearestResort(5.28, 73.49, resorts).slug, 'east');
});

test('normalizes resort event operations without forcing recurrence', () => {
  const event = normalizeSkyEventInput({
    title: 'Perseids at the beach',
    eventType: 'meteor',
    startsAt: '2026-08-21T20:00:00.000Z',
    status: 'sold_out',
    capacity: 12,
    priceOverrideUsd: 45,
    imageUrl: 'https://example.com/perseids.webp',
  });

  assert.equal(event.status, 'sold_out');
  assert.equal(event.capacity, 12);
  assert.equal(event.priceOverrideUsd, 45);
});

test('accepts Indonesia pilot coordinates and rejects invalid coordinates', () => {
  assert.deepEqual(validateResortLocation({ latitude: -6.2088, longitude: 106.8456 }), {
    latitude: -6.2088,
    longitude: 106.8456,
  });
  assert.throws(() => validateResortLocation({ latitude: -100, longitude: 106.8456 }), /latitude/);
});
