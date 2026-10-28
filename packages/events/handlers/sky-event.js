import { insertNotification } from './notification.js';

/** Reminders before each published event: 48h, 24h, then 3h, 2h and 1h on the day. */
export const REMINDER_OFFSETS_MINUTES = Object.freeze([2880, 1440, 180, 120, 60]);

const MINUTE = 60_000;

function eventTime(startsAt, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(startsAt));
}

function startsIn(minutesLeft) {
  const hours = Math.max(1, Math.round(minutesLeft / 60));
  if (hours >= 47) return 'in 2 days';
  return hours === 1 ? 'in 1 hour' : `in ${hours} hours`;
}

/**
 * Which reminder to send now for one event. When a run was missed, only the closest
 * reminder goes out and the skipped ones are marked sent, so nobody gets a burst.
 */
export function dueReminder(startsAt, now, sentOffsets = []) {
  const minutesLeft = (new Date(startsAt).getTime() - new Date(now).getTime()) / MINUTE;
  const sent = new Set(sentOffsets.map(Number));
  const due = REMINDER_OFFSETS_MINUTES.filter((offset) => minutesLeft > 0 && minutesLeft <= offset && !sent.has(offset));
  if (!due.length) return { send: null, mark: [], minutesLeft };
  const closest = Math.min(...due);
  // A closer reminder already went out (e.g. the event was moved earlier): only catch up the log.
  const alreadyCloser = [...sent].some((offset) => offset < closest);
  return { send: alreadyCloser ? null : closest, mark: due, minutesLeft };
}

/** Notifies the resort's staff when a published event is created, changed or cancelled. */
export async function handleSkyEventChanged(payload, { client, query, eventType, actorId }) {
  const db = client || { query };
  if (!payload?.skyEventId) return;
  const { rows } = await db.query(
    `SELECT se.id, se.title, se.starts_at, se.status, se.observation_spot, se.resort_id, r.timezone
     FROM sky_events se JOIN resorts r ON r.id = se.resort_id
     WHERE se.id = $1`,
    [payload.skyEventId],
  );
  const event = rows[0];
  if (!event) return;

  const cancelled = payload.previousStatus === 'published' && ['cancelled', 'sold_out'].includes(event.status);
  if (event.status !== 'published' && !cancelled) return;

  let title = `Event updated: ${event.title}`;
  if (eventType === 'sky_event.created') {
    title = payload.occurrences > 1 ? `New weekly event: ${event.title}` : `New event: ${event.title}`;
  } else if (cancelled) {
    title = `${event.status === 'sold_out' ? 'Sold out' : 'Cancelled'}: ${event.title}`;
  }
  const when = eventTime(event.starts_at, event.timezone);
  const message = payload.occurrences > 1
    ? `Every week from ${when}${event.observation_spot ? ` · ${event.observation_spot}` : ''}`
    : `${when}${event.observation_spot ? ` · ${event.observation_spot}` : ''}`;

  const { rows: staff } = await db.query(
    `SELECT id, role FROM users
     WHERE role IN ('internal', 'external') AND status = 'active' AND resort_id = $1`,
    [event.resort_id],
  );
  for (const member of staff) {
    if (member.id === actorId) continue;
    await insertNotification(db, {
      recipientUserId: member.id,
      type: 'event',
      sourceTable: 'sky_events',
      sourceId: event.id,
      title,
      message,
      meta: 'Upcoming Events',
      link: `/dashboard/${member.role}/sky-events`,
      markUnread: true,
    });
  }
}

/**
 * Sends the reminders that are due now to the active external staff of each event's resort.
 * Run it every 10 minutes. Call inside a transaction: events are locked so overlapping runs
 * cannot send the same reminder twice.
 */
export async function sendDueEventReminders(client, { now = new Date() } = {}) {
  const horizon = new Date(now.getTime() + (REMINDER_OFFSETS_MINUTES[0] + 1) * MINUTE);
  const { rows: events } = await client.query(
    `SELECT se.id, se.title, se.starts_at, se.observation_spot, se.resort_id, r.timezone
     FROM sky_events se
     JOIN resorts r ON r.id = se.resort_id AND r.status = 'active'
     WHERE se.status = 'published' AND se.is_published = true
       AND se.starts_at > $1 AND se.starts_at <= $2
     ORDER BY se.starts_at
     FOR UPDATE`,
    [now, horizon],
  );
  if (!events.length) return { checked: 0, sent: 0, notified: 0 };

  const ids = events.map((event) => event.id);
  const { rows: sentRows } = await client.query(
    'SELECT sky_event_id, offset_minutes FROM sky_event_reminders WHERE sky_event_id = ANY($1::uuid[])',
    [ids],
  );
  const { rows: staff } = await client.query(
    `SELECT id, resort_id FROM users
     WHERE role = 'external' AND status = 'active' AND resort_id = ANY($1::uuid[])`,
    [[...new Set(events.map((event) => event.resort_id))]],
  );

  let sent = 0;
  let notified = 0;
  for (const event of events) {
    const already = sentRows.filter((row) => String(row.sky_event_id) === String(event.id)).map((row) => row.offset_minutes);
    const reminder = dueReminder(event.starts_at, now, already);
    for (const offset of reminder.mark) {
      await client.query('INSERT INTO sky_event_reminders (sky_event_id, offset_minutes) VALUES ($1, $2)', [event.id, offset]);
    }
    if (!reminder.send) continue;
    sent += 1;
    const where = event.observation_spot ? ` · ${event.observation_spot}` : '';
    for (const member of staff.filter((row) => String(row.resort_id) === String(event.resort_id))) {
      await insertNotification(client, {
        recipientUserId: member.id,
        type: 'event',
        sourceTable: 'sky_events',
        sourceId: event.id,
        title: `Reminder: ${event.title} starts ${startsIn(reminder.minutesLeft)}`,
        message: `${eventTime(event.starts_at, event.timezone)}${where}`,
        meta: 'Upcoming Events',
        link: '/dashboard/external/sky-events',
        markUnread: true,
      });
      notified += 1;
    }
  }
  return { checked: events.length, sent, notified };
}
