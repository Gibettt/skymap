const SERVICE_CHARGE_RATE = 0.10;
const GST_RATE = 0.17;
const OPERATION_SHARE_RATE = 0.50;
const STAFF_COMMISSION_RATE = 0.05;

const roundUsd = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function calculateBookingTotals({ adultCount, childCount, adultPriceUsd, childPriceUsd }) {
  const baseTotalUsd = roundUsd((adultCount * adultPriceUsd) + (childCount * childPriceUsd));
  const serviceChargeUsd = roundUsd(baseTotalUsd * SERVICE_CHARGE_RATE);
  const gstUsd = roundUsd(baseTotalUsd * GST_RATE);
  const invoiceTotalUsd = roundUsd(baseTotalUsd + serviceChargeUsd + gstUsd);
  const operationShareUsd = roundUsd(baseTotalUsd * OPERATION_SHARE_RATE);
  const companyShareUsd = roundUsd(baseTotalUsd * OPERATION_SHARE_RATE);
  const staffCommissionUsd = roundUsd(operationShareUsd * STAFF_COMMISSION_RATE);

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
