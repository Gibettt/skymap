import assert from 'node:assert/strict';
import test from 'node:test';
import { createSkyEventSchema } from '../validators/sky-event.js';

const event = {
  title: 'Meteor Shower',
  eventType: 'meteor',
  startsAt: '2026-08-21T20:00:00.000Z',
  endsAt: '',
  description: '',
  sourceName: 'IMO',
  visibility: 'both',
  isPublished: true,
};

test('sky-event source links allow only safe web protocols', () => {
  assert.equal(createSkyEventSchema.safeParse({ ...event, sourceUrl: 'https://www.imo.net/' }).success, true);
  assert.equal(createSkyEventSchema.safeParse({ ...event, sourceUrl: 'javascript:alert(1)' }).success, false);
});
