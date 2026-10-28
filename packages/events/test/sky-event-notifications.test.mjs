import assert from 'node:assert/strict';
import test from 'node:test';

import { dueReminder, handleSkyEventChanged, sendDueEventReminders } from '../handlers/sky-event.js';

const START = '2026-11-05T15:00:00.000Z'; // 20:00 in the Maldives
const at = (hoursBefore) => new Date(new Date(START).getTime() - hoursBefore * 3_600_000);

test('each reminder fires once at 48h, 24h, 3h, 2h and 1h before the event', () => {
  assert.equal(dueReminder(START, at(49)).send, null);
  assert.equal(dueReminder(START, at(47.9)).send, 2880);
  assert.equal(dueReminder(START, at(47.9), [2880]).send, null);
  assert.equal(dueReminder(START, at(23.9), [2880]).send, 1440);
  assert.equal(dueReminder(START, at(2.9), [2880, 1440]).send, 180);
  assert.equal(dueReminder(START, at(1.9), [2880, 1440, 180]).send, 120);
  assert.equal(dueReminder(START, at(0.9), [2880, 1440, 180, 120]).send, 60);
  assert.equal(dueReminder(START, at(-0.1), []).send, null);
});

test('a missed run sends only the closest reminder and logs the skipped ones', () => {
  // Created 10 hours before: no "2 days" and "24 hours" burst, just the 24h one, logging both.
  assert.deepEqual(dueReminder(START, at(10)), { send: 1440, mark: [2880, 1440], minutesLeft: 600 });
  // A closer reminder already went out: catch up the log silently.
  assert.equal(dueReminder(START, at(2.5), [60]).send, null);
});

function fakeClient({ events, sent = [], staff }) {
  const calls = [];
  return {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes('FROM sky_events se')) return { rows: events };
      if (sql.startsWith('SELECT sky_event_id')) return { rows: sent };
      if (sql.includes('FROM users')) return { rows: staff };
      return { rows: [{ id: 'notification' }] };
    },
  };
}

test('due reminders go to the active external staff of that resort, and are logged', async () => {
  const client = fakeClient({
    events: [{ id: 'e1', title: 'Beach Stargazing', starts_at: new Date(START), observation_spot: 'Palm Beach', resort_id: 'r1', timezone: 'Indian/Maldives' }],
    sent: [{ sky_event_id: 'e1', offset_minutes: 2880 }],
    staff: [{ id: 'ext-1', resort_id: 'r1' }, { id: 'ext-other-resort', resort_id: 'r2' }],
  });

  const result = await sendDueEventReminders(client, { now: at(23.5) });

  assert.deepEqual(result, { checked: 1, sent: 1, notified: 1 });
  assert.match(client.calls[0].sql, /FOR UPDATE$/);
  const logged = client.calls.filter((call) => call.sql.startsWith('INSERT INTO sky_event_reminders'));
  assert.deepEqual(logged.map((call) => call.params), [['e1', 1440]]);
  const notices = client.calls.filter((call) => call.sql.includes('INSERT INTO notifications'));
  assert.equal(notices.length, 1);
  assert.equal(notices[0].params[0], 'ext-1');
  assert.equal(notices[0].params[1], 'event');
  assert.equal(notices[0].params[4], 'Reminder: Beach Stargazing starts in 24 hours');
  assert.match(notices[0].params[5], /Thu 5 Nov.*20:00 · Palm Beach/);
  assert.match(notices[0].sql, /read_at = NULL/);
});

test('publishing or cancelling an event notifies the resort staff except the author', async () => {
  const published = fakeClient({
    events: [{ id: 'e1', title: 'Weekly Telescope Night', starts_at: new Date(START), status: 'published', observation_spot: null, resort_id: 'r1', timezone: 'Indian/Maldives' }],
    staff: [{ id: 'internal-author', role: 'internal' }, { id: 'ext-1', role: 'external' }],
  });
  await handleSkyEventChanged({ skyEventId: 'e1', occurrences: 30 }, { client: published, eventType: 'sky_event.created', actorId: 'internal-author' });
  const notices = published.calls.filter((call) => call.sql.includes('INSERT INTO notifications'));
  assert.deepEqual(notices.map((call) => call.params[0]), ['ext-1']);
  assert.equal(notices[0].params[4], 'New weekly event: Weekly Telescope Night');
  assert.equal(notices[0].params[7], '/dashboard/external/sky-events');

  const draft = fakeClient({ events: [{ id: 'e2', title: 'Draft', starts_at: new Date(START), status: 'draft', resort_id: 'r1' }], staff: [{ id: 'ext-1', role: 'external' }] });
  await handleSkyEventChanged({ skyEventId: 'e2' }, { client: draft, eventType: 'sky_event.updated', actorId: 'x' });
  assert.equal(draft.calls.some((call) => call.sql.includes('INSERT INTO notifications')), false);

  const cancelled = fakeClient({ events: [{ id: 'e3', title: 'Moon Night', starts_at: new Date(START), status: 'cancelled', resort_id: 'r1', timezone: 'UTC' }], staff: [{ id: 'ext-1', role: 'external' }] });
  await handleSkyEventChanged({ skyEventId: 'e3', previousStatus: 'published' }, { client: cancelled, eventType: 'sky_event.updated', actorId: 'x' });
  assert.equal(cancelled.calls.find((call) => call.sql.includes('INSERT INTO notifications')).params[4], 'Cancelled: Moon Night');
});
