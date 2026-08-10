import { assertSameOrigin, ApiError, jsonError, requireUser, writeAudit } from '@/lib/auth';
import { transaction } from '@/lib/db';
import { calculateBookingTotals } from '@/lib/booking-finance';

function cleanText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function cleanList(value) {
  if (!Array.isArray(value)) return null;
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12);
}

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json();

    const updated = await transaction(async (client) => {
      const beforeResult = await client.query('SELECT * FROM bookings WHERE id = $1', [id]);
      const before = beforeResult.rows[0];
      if (!before) return null;
      if (user.role === 'external' && before.staff_id !== user.id) {
        throw new ApiError(403, 'Forbidden');
      }

      const packageId = body.packageId || before.package_id;
      const pkg = await client.query('SELECT * FROM packages WHERE id = $1', [packageId]);
      if (!pkg.rows[0]) throw new Error('Package not found');

      const adultCount = Number(body.adultCount ?? before.adult_count);
      const childCount = Number(body.childCount ?? before.child_count);
      const childPriceUsd = pkg.rows[0].child_price_usd ?? (pkg.rows[0].package_type === 'kids' ? pkg.rows[0].adult_price_usd : pkg.rows[0].adult_price_usd * 0.5);
      const totals = calculateBookingTotals({
        adultCount,
        childCount,
        adultPriceUsd: Number(pkg.rows[0].adult_price_usd),
        childPriceUsd: Number(childPriceUsd),
      });

      const nextStatus = body.status ?? before.status;
      const signedByGuest = user.role === 'external'
        ? before.signed_by_guest
        : Boolean(body.signedByGuest ?? before.signed_by_guest);
      const addOns = cleanList(body.addOns);
      const guestEmail = body.guestEmail === undefined ? before.guest_email : cleanText(body.guestEmail);

      if (user.role === 'external' && !['pending_review', 'cancelled'].includes(nextStatus)) {
        throw new ApiError(403, 'External staff cannot change operational status');
      }
      if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        throw new ApiError(400, 'Invalid email');
      }

      const { rows } = await client.query(
        `UPDATE bookings SET
          event_date = $2,
          time_start = $3,
          time_end = $4,
          guest_name = $5,
          guest_phone = $6,
          guest_email = $7,
          preferred_language = $8,
          room_number = $9,
          nationality = $10,
          adult_count = $11,
          child_count = $12,
          child_ages = $13,
          special_occasion = $14,
          booking_source = $15,
          package_id = $16,
          add_ons = $17::jsonb,
          package_notes = $18,
          status = $19,
          signed_by_guest = $20,
          notes = $21,
          payment_method = $22,
          invoice_number = $23,
          billing_notes = $24,
          weather_condition = $25,
          equipment_needed = $26,
          assigned_astronomer = $27,
          assigned_butler = $28,
          setup_status = $29,
          base_total_usd = $30,
          service_charge_10_usd = $31,
          gst_17_usd = $32,
          invoice_total_usd = $33,
          operation_share_50_usd = $34,
          company_share_50_usd = $35,
          staff_commission_5_usd = $36,
          field_tip_incentive_usd = $37,
          tip_recipient = $38,
          tip_notes = $39,
          payout_status = $40,
          updated_by = $41
         WHERE id = $1
         RETURNING *`,
        [
          id,
          body.eventDate ?? before.event_date,
          body.timeStart ?? before.time_start,
          body.timeEnd ?? before.time_end,
          body.guestName ?? before.guest_name,
          body.guestPhone === undefined ? before.guest_phone : cleanText(body.guestPhone),
          guestEmail,
          body.preferredLanguage === undefined ? before.preferred_language : cleanText(body.preferredLanguage),
          body.roomNumber ?? before.room_number,
          body.nationality ?? before.nationality,
          adultCount,
          childCount,
          body.childAges ?? before.child_ages,
          body.specialOccasion === undefined ? before.special_occasion : cleanText(body.specialOccasion),
          body.bookingSource === undefined ? before.booking_source : cleanText(body.bookingSource),
          packageId,
          addOns === null ? JSON.stringify(before.add_ons || []) : JSON.stringify(addOns),
          body.packageNotes === undefined ? before.package_notes : cleanText(body.packageNotes),
          nextStatus,
          signedByGuest,
          body.notes ?? before.notes,
          body.paymentMethod === undefined ? before.payment_method : cleanText(body.paymentMethod),
          body.invoiceNumber === undefined ? before.invoice_number : cleanText(body.invoiceNumber),
          body.billingNotes === undefined ? before.billing_notes : cleanText(body.billingNotes),
          body.weatherCondition === undefined ? before.weather_condition : cleanText(body.weatherCondition),
          body.equipmentNeeded === undefined ? before.equipment_needed : cleanText(body.equipmentNeeded),
          body.assignedAstronomer === undefined ? before.assigned_astronomer : cleanText(body.assignedAstronomer),
          body.assignedButler === undefined ? before.assigned_butler : cleanText(body.assignedButler),
          body.setupStatus === undefined ? before.setup_status : cleanText(body.setupStatus) || 'not_started',
          totals.baseTotalUsd,
          totals.serviceChargeUsd,
          totals.gstUsd,
          totals.invoiceTotalUsd,
          totals.operationShareUsd,
          totals.companyShareUsd,
          totals.staffCommissionUsd,
          body.fieldTipIncentiveUsd ?? before.field_tip_incentive_usd,
          body.tipRecipient === undefined ? before.tip_recipient : cleanText(body.tipRecipient),
          body.tipNotes === undefined ? before.tip_notes : cleanText(body.tipNotes),
          user.role === 'admin' ? (body.payoutStatus ?? before.payout_status) : before.payout_status,
          user.id,
        ]
      );

      await writeAudit(client, {
        actorId: user.id,
        action: 'booking.update',
        entityType: 'booking',
        entityId: id,
        beforeData: before,
        afterData: rows[0],
        request,
      });
      return rows[0];
    });

    if (!updated) return Response.json({ error: 'Booking not found' }, { status: 404 });
    return Response.json({ booking: updated });
  } catch (error) {
    return jsonError(error);
  }
}
