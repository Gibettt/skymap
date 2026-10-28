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

test('new events may carry a weekly repeat end date; updates ignore it', async () => {
  const { createSkyEventSchema, updateSkyEventSchema } = await import('../validators/sky-event.js');
  const base = { title: 'Weekly stargazing', eventType: 'stargazing', startsAt: '2026-11-05T15:00:00.000Z' };

  assert.equal(createSkyEventSchema.parse(base).repeatWeeklyUntil, null);
  assert.equal(createSkyEventSchema.parse({ ...base, repeatWeeklyUntil: '2027-05-31' }).repeatWeeklyUntil, '2027-05-31');
  assert.equal(createSkyEventSchema.safeParse({ ...base, repeatWeeklyUntil: '31/05/2027' }).success, false);
  assert.equal('repeatWeeklyUntil' in updateSkyEventSchema.parse({ title: 'x', repeatWeeklyUntil: '2027-05-31' }), false);
});
