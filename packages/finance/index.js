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
const toCents = (value) => Math.round(Number(value) * 100);
const toUsd = (cents) => cents / 100;

function field(row, snakeName, camelName) {
  return row[snakeName] ?? row[camelName];
}

export function calculateBookingTotals({ adultCount, childCount, adultPriceUsd, childPriceUsd, staffRole = 'external' }) {
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
