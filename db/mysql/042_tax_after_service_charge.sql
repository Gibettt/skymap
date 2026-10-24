-- Migration 042: Tax is charged on the subtotal after service charge.
-- Example: 65.00 + 10% service charge = 71.50, then 71.50 x 17% = 12.16, total 83.66.
-- Only unpaid bookings are recalculated. Paid bookings already have an issued invoice
-- whose amounts must stay as issued.

UPDATE bookings
SET gst_17_usd = ROUND((base_total_usd + service_charge_10_usd) * tax_rate_percent / 100, 2),
    invoice_total_usd = base_total_usd + service_charge_10_usd
      + ROUND((base_total_usd + service_charge_10_usd) * tax_rate_percent / 100, 2)
WHERE payment_status = 'pending'
  AND base_total_usd > 0
  AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.booking_id = bookings.id);
