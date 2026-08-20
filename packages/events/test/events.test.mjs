import assert from 'node:assert/strict';
import test from 'node:test';
import { bus, emit, on, EventTypes } from '../index.js';

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

  const unsub2 = on('*', (payload, context) => {
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
