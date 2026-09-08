import assert from 'node:assert/strict';
import test from 'node:test';
import { emit, on, EventTypes } from '../index.js';
import { handlePayoutRequested } from '../handlers/payout.js';

test('EventBus allows subscribing and emitting domain events', async () => {
  let received = null;

  const unsubscribe = on('test.custom_event', (payload) => {
    received = payload;
  });

  await emit('test.custom_event', { key: 'value123' }, { skipLogging: true });

  assert.deepEqual(received, { key: 'value123' });
  unsubscribe();
});

test('EventBus handles multiple listeners including wildcard', async () => {
  const eventsReceived = [];

  const unsub1 = on('booking.test', (payload) => {
    eventsReceived.push(`specific:${payload.id}`);
  });

  const unsub2 = on('*', (_payload, context) => {
    eventsReceived.push(`wildcard:${context.eventType}`);
  });

  await emit('booking.test', { id: 'booking-99' }, { skipLogging: true });

  assert.ok(eventsReceived.includes('specific:booking-99'));
  assert.ok(eventsReceived.includes('wildcard:booking.test'));

  unsub1();
  unsub2();
});

test('EventBus isolates handler errors and prevents breaking emit pipeline', async () => {
  let subsequentExecuted = false;

  const unsubErr = on('test.error_event', () => {
    throw new Error('Intentional handler error');
  });

  const unsubOk = on('test.error_event', () => {
    subsequentExecuted = true;
  });

  // Should not throw
  await emit('test.error_event', {}, { skipLogging: true });

  assert.equal(subsequentExecuted, true);

  unsubErr();
  unsubOk();
});

test('EventTypes includes core lifecycle constants', () => {
  assert.equal(EventTypes.BOOKING_CREATED, 'booking.created');
  assert.equal(EventTypes.BOOKING_ACTIVATED, 'booking.active');
  assert.equal(EventTypes.BOOKING_COMPLETED, 'booking.completed');
  assert.equal(EventTypes.BOOKING_RESCHEDULED, 'booking.rescheduled');
  assert.equal(EventTypes.PAYOUT_REQUESTED, 'payout.requested');
});

test('payout request notifications link admins to the current finance route', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes("FROM users WHERE role = 'admin'")) {
        return { rows: [{ id: 'admin-one' }], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO notifications')) {
        return { rows: [{ id: 'notification-one' }], rowCount: 1 };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  await handlePayoutRequested({
    payoutId: 'payout-one',
    requesterId: 'staff-one',
    requesterName: 'Ari',
    requesterRole: 'external',
    amountUsd: 42,
    resortName: 'Meteor Resort',
  }, { client });

  const notification = calls.find(({ sql }) => sql.includes('INSERT INTO notifications'));
  assert.ok(notification);
  assert.equal(notification.params[6], 'Meteor Resort');
  assert.equal(notification.params[7], '/dashboard/admin/finance#payouts');
});
