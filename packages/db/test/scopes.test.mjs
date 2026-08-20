import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bookingScopeForUser,
  canManageBooking,
  canRescheduleBooking,
  canViewBooking,
} from '../scopes.js';

const admin = { id: 'admin-1', role: 'admin', resort_id: null };
const internal = { id: 'internal-1', role: 'internal', resort_id: 'resort-a' };
const external = { id: 'external-1', role: 'external', resort_id: 'resort-a' };

test('admin booking scope is global', () => {
  assert.deepEqual(bookingScopeForUser(admin), { whereClause: '1=1', values: [] });
});

test('internal staff scope is restricted to its resort', () => {
  assert.deepEqual(bookingScopeForUser(internal), {
    whereClause: 'b.resort_id = $1',
    values: ['resort-a'],
  });
  assert.equal(canViewBooking(internal, { resort_id: 'resort-a', staff_id: 'someone' }), true);
  assert.equal(canViewBooking(internal, { resort_id: 'resort-b', staff_id: 'someone' }), false);
  assert.equal(canManageBooking(internal, { resort_id: 'resort-a' }), true);
});

test('external staff can only view its own bookings and cannot manage status', () => {
  assert.deepEqual(bookingScopeForUser(external), {
    whereClause: 'b.staff_id = $1',
    values: ['external-1'],
  });
  assert.equal(canViewBooking(external, { resort_id: 'resort-a', staff_id: 'external-1' }), true);
  assert.equal(canViewBooking(external, { resort_id: 'resort-a', staff_id: 'external-2' }), false);
  assert.equal(canManageBooking(external, { resort_id: 'resort-a', staff_id: 'external-1' }), false);
  assert.equal(canRescheduleBooking(external, { resort_id: 'resort-a', staff_id: 'external-1' }), false);
});

test('users without a required scope identifier are rejected', () => {
  assert.throws(() => bookingScopeForUser({ id: 'internal-2', role: 'internal', resort_id: null }), /resort/i);
  assert.throws(() => bookingScopeForUser({ id: '', role: 'external', resort_id: 'resort-a' }), /user/i);
});
