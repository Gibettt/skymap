const SERVICE_CHARGE_RATE = 0.10;
const GST_RATE = 0.17;
const OPERATION_SHARE_RATE = 0.50;
const STAFF_COMMISSION_RATE = 0.05;
const INTERNAL_COMMISSION_BASE_RATE = 0.10;
const INTERNAL_COMMISSION_SHARE_RATE = 0.90;
const DEFAULT_REWARD_SETTINGS = Object.freeze({
  starAdultUnit: 1,
  starChildUnit: 0.5,
  starThreshold: 10,
  starBonusUsd: 10,
});

const PAYOUT_BLOCKING_STATUSES = new Set([
  'requested',
  'processed',
  'completed',
  // Transitional compatibility while migration 015 is being deployed.
  'approved',
  'paid',
]);

const roundUsd = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const toCents = (value) => Math.round(Number(value) * 100);
const toUsd = (cents) => cents / 100;

function field(row, snakeName, camelName) {
  return row[snakeName] ?? row[camelName];
}

export function calculateBookingTotals({ adultCount, childCount, adultPriceUsd, childPriceUsd, staffRole = 'external', isChargeable = true }) {
  if (!isChargeable) {
    return {
      baseTotalUsd: 0,
      serviceChargeUsd: 0,
      gstUsd: 0,
      invoiceTotalUsd: 0,
      operationShareUsd: 0,
      companyShareUsd: 0,
      staffCommissionUsd: 0,
    };
  }

  const baseCents = (adultCount * toCents(adultPriceUsd)) + (childCount * toCents(childPriceUsd));
  const serviceChargeCents = Math.round(baseCents * SERVICE_CHARGE_RATE);
  const gstCents = Math.round(baseCents * GST_RATE);
  const invoiceCents = baseCents + serviceChargeCents + gstCents;
  const operationShareCents = Math.round(baseCents * OPERATION_SHARE_RATE);
  const companyShareCents = Math.round(baseCents * OPERATION_SHARE_RATE);
  const staffCommissionCents = String(staffRole).toLowerCase() === 'internal'
    ? Math.round(baseCents * INTERNAL_COMMISSION_BASE_RATE * INTERNAL_COMMISSION_SHARE_RATE)
    : Math.round(operationShareCents * STAFF_COMMISSION_RATE);

  return {
    baseTotalUsd: toUsd(baseCents),
    serviceChargeUsd: toUsd(serviceChargeCents),
    gstUsd: toUsd(gstCents),
    invoiceTotalUsd: toUsd(invoiceCents),
    operationShareUsd: toUsd(operationShareCents),
    companyShareUsd: toUsd(companyShareCents),
    staffCommissionUsd: toUsd(staffCommissionCents),
  };
}

function isCompletedEligibleBooking(booking) {
  const status = field(booking, 'status', 'status');
  const signed = field(booking, 'signed_by_guest', 'signedByGuest');
  const isChargeable = field(booking, 'is_chargeable', 'isChargeable');
  return status === 'completed' && Boolean(signed) && isChargeable !== false;
}

function rewardSettings(input = {}) {
  const number = (snake, camel, fallback) => {
    const value = Number(input[snake] ?? input[camel] ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  };

  return {
    starAdultUnit: Math.max(0, number('star_adult_unit', 'starAdultUnit', DEFAULT_REWARD_SETTINGS.starAdultUnit)),
    starChildUnit: Math.max(0, number('star_child_unit', 'starChildUnit', DEFAULT_REWARD_SETTINGS.starChildUnit)),
    starThreshold: Math.max(0.01, number('star_threshold', 'starThreshold', DEFAULT_REWARD_SETTINGS.starThreshold)),
    starBonusUsd: Math.max(0, number('star_bonus_usd', 'starBonusUsd', DEFAULT_REWARD_SETTINGS.starBonusUsd)),
  };
}

function utcMonthBounds(now) {
  const date = now instanceof Date ? now : new Date(now);
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

function bookingDate(booking) {
  const value = field(booking, 'event_date', 'eventDate') || field(booking, 'booking_date', 'bookingDate');
  if (!value) return null;

  // PostgreSQL drivers may return a DATE column as a JavaScript Date. Keep
  // its calendar components instead of slicing the human-readable Date text.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  }

  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateOnly) return null;
  const date = new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateStarPoints(bookings, settings = DEFAULT_REWARD_SETTINGS, now = new Date()) {
  const config = rewardSettings(settings);
  const { start, end } = utcMonthBounds(now);
  return bookings.reduce((total, booking) => {
    if (!isCompletedEligibleBooking(booking)) return total;
    const date = bookingDate(booking);
    if (!date || date < start || date >= end) return total;
    const adultCount = Number(field(booking, 'adult_count', 'adultCount') || 0);
    const childCount = Number(field(booking, 'child_count', 'childCount') || 0);
    return total + (adultCount * config.starAdultUnit) + (childCount * config.starChildUnit);
  }, 0);
}

export function calculatePayoutSummary(bookings, payoutRequests = [], options = {}) {
  const role = options.role || 'external';
  const config = rewardSettings(options.settings);
  const commissionUsd = roundUsd(bookings.reduce((total, booking) => {
    if (!isCompletedEligibleBooking(booking)) return total;
    return total + Number(field(booking, 'staff_commission_5_usd', 'staffCommissionUsd') || 0);
  }, 0));

  const starUnits = role === 'external'
    ? roundUsd(calculateStarPoints(bookings, config, options.now || new Date()))
    : 0;
  const fullStars = role === 'external' ? Math.floor(starUnits / config.starThreshold) : 0;
  const starBonusUsd = roundUsd(fullStars * config.starBonusUsd);
  const partialProgressUsd = role === 'external'
    ? roundUsd(starUnits - (fullStars * config.starThreshold))
    : 0;
  const starRewardUsd = roundUsd(starBonusUsd + partialProgressUsd);
  const earnedUsd = roundUsd(commissionUsd + starRewardUsd);
  const blockedUsd = roundUsd(payoutRequests.reduce((total, payout) => {
    if (!PAYOUT_BLOCKING_STATUSES.has(payout.status)) return total;
    return total + Number(field(payout, 'amount_usd', 'amountUsd') || 0);
  }, 0));

  return {
    commissionUsd,
    starPoints: starUnits,
    starUnits,
    fullStars,
    starBonusUsd,
    partialProgressUsd,
    starRewardUsd,
    earnedUsd,
    requestedOrPaidUsd: blockedUsd,
    availableUsd: Math.max(0, roundUsd(earnedUsd - blockedUsd)),
    cycleStart: utcMonthBounds(options.now || new Date()).start.toISOString().slice(0, 10),
    starThreshold: config.starThreshold,
  };
}

export { DEFAULT_REWARD_SETTINGS };
