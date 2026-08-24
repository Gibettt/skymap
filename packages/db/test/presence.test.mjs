import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IDLE_AFTER_MS,
  OFFLINE_AFTER_MS,
  presenceStatus,
} from '../presence.js';

const now = Date.parse('2026-08-22T00:00:00.000Z');

test('presence becomes offline when no heartbeat exists or the timeout is reached', () => {
  assert.equal(presenceStatus({}, now), 'offline');
  assert.equal(presenceStatus({ lastSeenAt: new Date(now - OFFLINE_AFTER_MS) }, now), 'offline');
});

test('a recent heartbeat is idle until recent user activity is recorded', () => {
  assert.equal(presenceStatus({ lastSeenAt: new Date(now - 1_000) }, now), 'idle');
  assert.equal(presenceStatus({
    lastSeenAt: new Date(now - 1_000),
    lastActiveAt: new Date(now - IDLE_AFTER_MS),
  }, now), 'idle');
});

test('a recent heartbeat and activity are online', () => {
  assert.equal(presenceStatus({
    lastSeenAt: new Date(now - 1_000),
    lastActiveAt: new Date(now - 1_000),
  }, now), 'online');
});
