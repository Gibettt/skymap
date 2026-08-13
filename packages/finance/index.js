const SERVICE_CHARGE_RATE = 0.10;
const GST_RATE = 0.17;
const OPERATION_SHARE_RATE = 0.50;
const STAFF_COMMISSION_RATE = 0.05;
const INTERNAL_COMMISSION_BASE_RATE = 0.10;
const INTERNAL_COMMISSION_SHARE_RATE = 0.90;
const STAR_BONUS_USD = 10;

const STAR_STATUSES = new Set([
  'pending_review',
  'accepted',
  'booked',
  'finished_experience',
  'Menunggu',
  'Disetujui',
  'Booked',
  'Finished Experience',
]);
const PAYOUT_BLOCKING_STATUSES = new Set(['requested', 'approved', 'paid']);

const roundUsd = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function field(row, snakeName, camelName) {
  return row[snakeName] ?? row[camelName];
}

export function calculateBookingTotals({ adultCount, childCount, adultPriceUsd, childPriceUsd, staffRole = 'external' }) {
  const baseTotalUsd = roundUsd((adultCount * adultPriceUsd) + (childCount * childPriceUsd));
  const serviceChargeUsd = roundUsd(baseTotalUsd * SERVICE_CHARGE_RATE);
  const gstUsd = roundUsd(baseTotalUsd * GST_RATE);
  const invoiceTotalUsd = roundUsd(baseTotalUsd + serviceChargeUsd + gstUsd);
  const operationShareUsd = roundUsd(baseTotalUsd * OPERATION_SHARE_RATE);
  const companyShareUsd = roundUsd(baseTotalUsd * OPERATION_SHARE_RATE);
  const staffCommissionUsd = String(staffRole).toLowerCase() === 'internal'
    ? roundUsd(baseTotalUsd * INTERNAL_COMMISSION_BASE_RATE * INTERNAL_COMMISSION_SHARE_RATE)
    : roundUsd(operationShareUsd * STAFF_COMMISSION_RATE);

  return {
    baseTotalUsd,
    serviceChargeUsd,
    gstUsd,
    invoiceTotalUsd,
    operationShareUsd,
    companyShareUsd,
    staffCommissionUsd,
  };
}

export function calculateStarPoints(bookings) {
  return bookings.reduce((total, booking) => {
    const status = field(booking, 'status', 'status');
    if (!STAR_STATUSES.has(status)) return total;

    const childCount = Number(field(booking, 'child_count', 'childCount') || 0);
    return total + 1 + (childCount * 0.5);
  }, 0);
}

export function calculatePayoutSummary(bookings, payoutRequests = []) {
  const commissionUsd = roundUsd(bookings.reduce((total, booking) => {
    const signed = field(booking, 'signed_by_guest', 'signedByGuest');
    if (field(booking, 'status', 'status') !== 'finished_experience' || !signed) return total;
    return total + Number(field(booking, 'staff_commission_5_usd', 'staffCommissionUsd') || 0);
  }, 0));

  const starPoints = calculateStarPoints(bookings);
  const fullStars = Math.min(Math.floor(starPoints / 10), 5);
  const starBonusUsd = roundUsd(fullStars * STAR_BONUS_USD);
  const earnedUsd = roundUsd(commissionUsd + starBonusUsd);
  const blockedUsd = roundUsd(payoutRequests.reduce((total, payout) => {
    if (!PAYOUT_BLOCKING_STATUSES.has(payout.status)) return total;
    return total + Number(field(payout, 'amount_usd', 'amountUsd') || 0);
  }, 0));

  return {
    commissionUsd,
    starPoints,
    fullStars,
    starBonusUsd,
    earnedUsd,
    requestedOrPaidUsd: blockedUsd,
    availableUsd: Math.max(0, roundUsd(earnedUsd - blockedUsd)),
  };
}
