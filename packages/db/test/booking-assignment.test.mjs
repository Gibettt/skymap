import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingCreationState, assignedInternalAfterUpdate } from '../bookings.js';

test('external booking waits for same-resort internal approval', () => {
  assert.deepEqual(bookingCreationState({ role: 'external', id: 'external-1' }), {
    status: 'pending',
    assignedInternalId: null,
  });
  assert.deepEqual(bookingCreationState({ role: 'internal', id: 'internal-1' }), {
    status: 'active',
    assignedInternalId: 'internal-1',
  });
});

test('the internal approver becomes the assigned guide', () => {
  assert.equal(assignedInternalAfterUpdate({
    previousAssignedInternalId: null,
    previousStatus: 'pending',
    nextStatus: 'active',
    internalUserId: 'internal-1',
  }), 'internal-1');
});
