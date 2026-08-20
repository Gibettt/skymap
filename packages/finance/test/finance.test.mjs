import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateBookingTotals,
  calculatePayoutSummary,
} from '../index.js';

const SETTINGS = {
  star_adult_unit: 1,
  star_child_unit: 0.5,
  star_threshold: 10,
  star_bonus_usd: 10,
};

test('a non-chargeable package produces no invoice or commission', () => {
  assert.deepEqual(calculateBookingTotals({
    adultCount: 4,
    childCount: 2,
    adultPriceUsd: 100,
    childPriceUsd: 50,
    staffRole: 'external',
    isChargeable: false,
  }), {
    baseTotalUsd: 0,
    serviceChargeUsd: 0,
    gstUsd: 0,
    invoiceTotalUsd: 0,
    operationShareUsd: 0,
    companyShareUsd: 0,
    staffCommissionUsd: 0,
  });
});

test('external staff earns monthly stars, partial-unit cash, and persistent commission', () => {
  const bookings = [
    {
      status: 'completed',
      signed_by_guest: true,
      staff_commission_5_usd: 25,
      adult_count: 12,
      child_count: 0,
      is_chargeable: true,
      event_date: '2026-08-10',
    },
    {
      status: 'completed',
      signed_by_guest: true,
      staff_commission_5_usd: 8,
      adult_count: 10,
      child_count: 0,
      is_chargeable: true,
      event_date: '2026-07-10',
    },
    {
      status: 'completed',
      signed_by_guest: true,
      staff_commission_5_usd: 99,
      adult_count: 20,
      child_count: 0,
      is_chargeable: false,
      event_date: '2026-08-11',
    },
  ];

  const result = calculatePayoutSummary(bookings, [], {
    role: 'external',
    settings: SETTINGS,
    now: new Date('2026-08-19T00:00:00.000Z'),
  });

  assert.equal(result.commissionUsd, 33);
  assert.equal(result.starUnits, 12);
  assert.equal(result.fullStars, 1);
  assert.equal(result.starBonusUsd, 10);
  assert.equal(result.partialProgressUsd, 2);
  assert.equal(result.starRewardUsd, 12);
  assert.equal(result.earnedUsd, 45);
  assert.equal(result.availableUsd, 45);
});

test('external staff star calculation accepts PostgreSQL Date objects', () => {
  const result = calculatePayoutSummary([{
    status: 'completed',
    signed_by_guest: true,
    staff_commission_5_usd: 5,
    adult_count: 10,
    child_count: 0,
    is_chargeable: true,
    event_date: new Date(2026, 7, 10),
  }], [], {
    role: 'external',
    settings: SETTINGS,
    now: new Date('2026-08-19T00:00:00.000Z'),
  });

  assert.equal(result.starUnits, 10);
  assert.equal(result.fullStars, 1);
});

test('internal staff bypasses stars but keeps eligible commission', () => {
  const result = calculatePayoutSummary([{
    status: 'completed',
    signed_by_guest: true,
    staff_commission_5_usd: 18,
    adult_count: 15,
    child_count: 2,
    is_chargeable: true,
    event_date: '2026-08-12',
  }], [], {
    role: 'internal',
    settings: SETTINGS,
    now: new Date('2026-08-19T00:00:00.000Z'),
  });

  assert.equal(result.commissionUsd, 18);
  assert.equal(result.starUnits, 0);
  assert.equal(result.starRewardUsd, 0);
  assert.equal(result.earnedUsd, 18);
});

test('requested, processed, and completed payouts reduce the available balance', () => {
  const result = calculatePayoutSummary([{
    status: 'completed',
    signed_by_guest: true,
    staff_commission_5_usd: 50,
    adult_count: 0,
    child_count: 0,
    is_chargeable: true,
    event_date: '2026-08-12',
  }], [
    { status: 'requested', amount_usd: 10 },
    { status: 'processed', amount_usd: 5 },
    { status: 'completed', amount_usd: 7 },
    { status: 'rejected', amount_usd: 99 },
  ], {
    role: 'internal',
    settings: SETTINGS,
    now: new Date('2026-08-19T00:00:00.000Z'),
  });

  assert.equal(result.requestedOrPaidUsd, 22);
  assert.equal(result.availableUsd, 28);
});
