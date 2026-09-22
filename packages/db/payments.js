const CUSTOMER_PAYMENT_ELIGIBLE_STATUSES = new Set(["active", "rescheduled", "completed"]);
const CUSTOMER_PAYMENT_METHODS = new Map([
  ["bank transfer", "Bank transfer"],
  ["cash", "Cash"],
]);
const CUSTOMER_TAX_LABELS = new Map([
  ["none", "No tax"],
  ["tgst", "Tourism GST (TGST)"],
  ["vat", "VAT"],
  ["sales_tax", "Sales tax"],
]);

const roundMoney = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
};

export function normalizeCustomerPaymentMethod(value) {
  return (
    CUSTOMER_PAYMENT_METHODS.get(
      String(value ?? "")
        .trim()
        .toLowerCase(),
    ) ?? null
  );
}

export function normalizeCustomerTax({ taxType = "tgst", taxLabel, taxRatePercent = 17 } = {}) {
  const normalizedType = CUSTOMER_TAX_LABELS.has(taxType) || taxType === "custom" ? taxType : "tgst";
  const requestedRate = Number(taxRatePercent);
  const rate = Number.isFinite(requestedRate) ? Math.min(100, Math.max(0, requestedRate)) : 17;
  if (normalizedType === "none") {
    return { taxLabel: "No tax", taxRatePercent: 0 };
  }
  return {
    taxLabel:
      normalizedType === "custom"
        ? String(taxLabel ?? "")
            .trim()
            .slice(0, 80)
        : CUSTOMER_TAX_LABELS.get(normalizedType),
    taxRatePercent: Math.round(rate * 100) / 100,
  };
}

export function validateCustomerPaymentConfirmation(
  booking,
  { paymentMethod: requestedPaymentMethod, reference } = {},
) {
  if (!booking) return { error: "Booking not found.", status: 404 };
  if (!CUSTOMER_PAYMENT_ELIGIBLE_STATUSES.has(booking.status)) {
    return {
      error: "Only active, rescheduled, or completed bookings can receive payment.",
      status: 409,
    };
  }
  if (roundMoney(booking.invoice_total_usd) <= 0) {
    return { error: "This booking has no chargeable amount.", status: 409 };
  }

  const paymentMethod = normalizeCustomerPaymentMethod(requestedPaymentMethod ?? booking.payment_method);
  if (!paymentMethod) {
    return {
      error: "Set the booking payment method to Bank transfer or Cash before confirming payment.",
      status: 409,
    };
  }
  if (paymentMethod === "Bank transfer" && !String(reference ?? booking.payment_reference ?? "").trim()) {
    return { error: "A bank transfer reference is required.", status: 400 };
  }

  return { paymentMethod };
}

export async function confirmCustomerPayment(
  client,
  { bookingId, confirmedById, notes, paymentMethod, reference, resortId = null, taxLabel, taxRatePercent, taxType },
) {
  const bookingScope = resortId ? " AND resort_id = $2" : "";
  const bookingParams = resortId ? [bookingId, resortId] : [bookingId];
  const { rows } = await client.query(`SELECT * FROM bookings WHERE id = $1${bookingScope} FOR UPDATE`, bookingParams);
  const booking = rows[0];
  const validation = validateCustomerPaymentConfirmation(booking, {
    paymentMethod,
    reference,
  });
  if (validation.error) return validation;

  if (booking.payment_status === "paid") {
    return { booking, confirmed: false };
  }
  if (booking.payment_status !== "pending") {
    return {
      error: "The booking has an unsupported payment status.",
      status: 409,
    };
  }

  const normalizedReference = String(reference ?? "").trim() || null;
  const normalizedNotes = String(notes ?? "").trim() || null;
  const normalizedTax = taxType
    ? normalizeCustomerTax({ taxType, taxLabel, taxRatePercent })
    : {
        taxLabel: String(booking.tax_label ?? "Tourism GST (TGST)"),
        taxRatePercent: roundMoney(booking.tax_rate_percent ?? 17),
      };
  const subtotal = roundMoney(booking.base_total_usd);
  const serviceCharge = roundMoney(booking.service_charge_10_usd);
  const taxAmount = roundMoney(subtotal * (normalizedTax.taxRatePercent / 100));
  const invoiceTotal = roundMoney(subtotal + serviceCharge + taxAmount);
  const updateScope = resortId ? " AND resort_id = $10" : "";
  const updateParams = [
    bookingId,
    validation.paymentMethod,
    confirmedById,
    normalizedReference,
    normalizedNotes,
    normalizedTax.taxLabel,
    normalizedTax.taxRatePercent,
    taxAmount,
    invoiceTotal,
  ];
  if (resortId) updateParams.push(resortId);

  const updated = await client.query(
    `UPDATE bookings SET
      payment_status = 'paid',
      payment_method = $2,
      payment_confirmed_at = now(),
      payment_confirmed_by = $3,
      payment_reference = $4,
      payment_notes = $5,
      tax_label = $6,
      tax_rate_percent = $7,
      gst_17_usd = $8,
      invoice_total_usd = $9,
      updated_by = $3
	 WHERE id = $1 AND payment_status = 'pending'${updateScope}
     RETURNING *`,
    updateParams,
  );

  if (!updated.rows[0]) {
    return {
      error: "Payment status changed while it was being confirmed. Refresh and try again.",
      status: 409,
    };
  }
  return { booking: updated.rows[0], confirmed: true };
}
