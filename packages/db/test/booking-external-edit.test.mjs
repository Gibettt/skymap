import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateBookingTotals } from '../../finance/index.js';
import {
  bookingUpdateInputForStaff,
  externalBookingEditError,
  priceBookingExperiences,
} from '../bookings.js';

const external = { id: 'external-1', role: 'external' };
const booking = (overrides = {}) => ({
  staff_id: 'external-1',
  status: 'active',
  payment_status: 'pending',
  ...overrides,
});

test('external staff can edit their own unpaid open bookings', () => {
  assert.equal(externalBookingEditError(external, booking()), null);
  assert.equal(externalBookingEditError(external, booking({ status: 'pending' })), null);
  assert.equal(externalBookingEditError(external, booking({ status: 'rescheduled' })), null);
});

test('external staff cannot edit other, closed, or paid bookings', () => {
  assert.equal(externalBookingEditError(external, booking({ staff_id: 'someone-else' })).status, 403);
  assert.equal(externalBookingEditError(external, booking({ status: 'completed' })).status, 409);
  assert.equal(externalBookingEditError(external, booking({ status: 'cancelled_by_guest' })).status, 409);
  assert.equal(externalBookingEditError(external, booking({ payment_status: 'paid' })).status, 409);
});

test('external edits cannot change operational or finance controls', () => {
  const input = {
    participants: [{ fullName: 'A' }],
    addOns: ['Champagne'],
    status: 'completed',
    signedByGuest: true,
    payoutStatus: 'commission_paid',
    fieldTipIncentiveUsd: 50,
    assignedAstronomer: 'Me',
  };

  assert.deepEqual(bookingUpdateInputForStaff(external, input), {
    participants: [{ fullName: 'A' }],
    addOns: ['Champagne'],
  });
  assert.equal(bookingUpdateInputForStaff({ role: 'internal' }, input), input);
});

function fakeClient(packages) {
  return {
    async query(sql, params) {
      if (sql.startsWith('SELECT * FROM packages')) {
        return { rows: packages.filter((item) => item.id === params[0]) };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

const pkg = (id, overrides = {}) => ({
  id,
  resort_id: 'resort-1',
  is_active: true,
  is_chargeable: true,
  package_type: 'regular',
  adult_price_usd: '65.00',
  child_price_usd: null,
  ...overrides,
});

test('every experience is priced and combined, so an added package raises the total', async () => {
  const priced = await priceBookingExperiences(fakeClient([pkg('main'), pkg('addon', { adult_price_usd: '20.00' })]), {
    experiences: [{ packageId: 'main' }, { packageId: 'addon' }],
    resortId: 'resort-1',
    adultCount: 2,
    childCount: 0,
    staffRole: 'external',
    calculateTotals: calculateBookingTotals,
  });

  assert.equal(priced.error, undefined);
  assert.equal(priced.experiences.length, 2);
  assert.equal(priced.totals.baseTotalUsd, 170);
  assert.equal(priced.totals.serviceChargeUsd, 17);
  assert.equal(priced.totals.gstUsd, 31.79);
  assert.equal(priced.totals.invoiceTotalUsd, 218.79);
});

test('packages from another resort or inactive packages are rejected unless already booked', async () => {
  const client = fakeClient([pkg('other', { resort_id: 'resort-2' }), pkg('old', { is_active: false })]);
  const base = { resortId: 'resort-1', adultCount: 1, childCount: 0, staffRole: 'external', calculateTotals: calculateBookingTotals };

  assert.equal((await priceBookingExperiences(client, { ...base, experiences: [{ packageId: 'other' }] })).status, 400);
  assert.equal((await priceBookingExperiences(client, { ...base, experiences: [{ packageId: 'old' }] })).status, 400);
  const kept = await priceBookingExperiences(client, {
    ...base,
    experiences: [{ packageId: 'old' }],
    keepInactivePackageIds: ['old'],
  });
  assert.equal(kept.totals.baseTotalUsd, 65);
});

test('external booking responses carry what the edit form needs, but not billing details', async () => {
  const { bookingResponseForStaff } = await import('../bookings.js');
  const response = bookingResponseForStaff(external, {
    id: 'booking-1',
    payment_status: 'pending',
    package_id: 'package-1',
    special_occasion: 'Birthday',
    payment_method: 'Room charge',
  });

  assert.deepEqual(response, {
    id: 'booking-1',
    payment_status: 'pending',
    package_id: 'package-1',
    special_occasion: 'Birthday',
  });
});
