import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_WEEKLY_OCCURRENCES, weeklyOccurrences } from '../index.js';

test('a weekly event repeats on the same weekday and time until the end date', () => {
  // Thursday 20:00 in the Maldives (UTC+5).
  const occurrences = weeklyOccurrences({
    startsAt: '2026-11-05T15:00:00.000Z',
    endsAt: '2026-11-05T16:00:00.000Z',
    until: '2026-11-26',
    timeZone: 'Indian/Maldives',
  });

  assert.deepEqual(occurrences.map((item) => item.startsAt), [
    '2026-11-05T15:00:00.000Z',
    '2026-11-12T15:00:00.000Z',
    '2026-11-19T15:00:00.000Z',
    '2026-11-26T15:00:00.000Z',
  ]);
  assert.equal(occurrences[3].endsAt, '2026-11-26T16:00:00.000Z');
});

test('the end date is read in the resort time zone, not UTC', () => {
  // 01:00 local on 6 Nov is still 5 Nov in UTC; ending on 6 Nov must include it.
  const occurrences = weeklyOccurrences({
    startsAt: '2026-11-05T20:00:00.000Z',
    until: '2026-11-06',
    timeZone: 'Indian/Maldives',
  });
  assert.equal(occurrences.length, 1);
  assert.equal(occurrences[0].endsAt, null);
});

test('seven months of weekly sessions are one call, but more than a year is refused', () => {
  const sevenMonths = weeklyOccurrences({ startsAt: '2026-11-05T15:00:00.000Z', until: '2027-05-31', timeZone: 'Indian/Maldives' });
  assert.equal(sevenMonths.length, 30);

  assert.throws(
    () => weeklyOccurrences({ startsAt: '2026-11-05T15:00:00.000Z', until: '2028-01-01', timeZone: 'Indian/Maldives' }),
    new RegExp(`limited to ${MAX_WEEKLY_OCCURRENCES}`),
  );
  assert.throws(() => weeklyOccurrences({ startsAt: '2026-11-05T15:00:00.000Z', until: '2026-11-01' }), /on or after/);
  assert.throws(() => weeklyOccurrences({ startsAt: '2026-11-05T15:00:00.000Z', until: '5/11/2026' }), /invalid/);
});
