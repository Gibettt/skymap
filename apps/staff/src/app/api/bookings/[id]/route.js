import { assertSameOrigin, ApiError, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { transaction, refreshAfterBookingChange } from '@ephemeris/db';
import { bookingSelectQuery, cleanText } from '@ephemeris/db/helpers';
import { updateBookingSchema } from '@ephemeris/db/validators/booking';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { emit, EventTypes } from '@ephemeris/events';
import { calculateBookingTotals } from '@ephemeris/finance';

const INTERNAL_STATUS_UPDATES = new Set(['accepted', 'rejected', 'booked', 'finished_experience', 'cancelled']);

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser();
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const id = parseId.data;
    const parsed = updateBookingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data booking tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;

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
      const staffResult = await client.query('SELECT role FROM users WHERE id = $1', [before.staff_id]);
      const staffRole = staffResult.rows[0]?.role || user.role;

      const adultCount = body.adultCount !== undefined ? Number(body.adultCount) : Number(before.adult_count);
      const childCount = body.childCount !== undefined ? Number(body.childCount) : Number(before.child_count);
      if (adultCount + childCount <= 0) {
        throw new ApiError(400, 'Minimal harus ada 1 tamu (dewasa atau anak)');
      }
      const childPriceUsd = pkg.rows[0].child_price_usd ?? (pkg.rows[0].package_type === 'kids' ? pkg.rows[0].adult_price_usd : pkg.rows[0].adult_price_usd * 0.5);
      const totals = calculateBookingTotals({
        adultCount,
        childCount,
        adultPriceUsd: Number(pkg.rows[0].adult_price_usd),
        childPriceUsd: Number(childPriceUsd),
        staffRole,
      });

      const nextStatus = body.status ?? before.status;
      const signedByGuest = user.role === 'external'
        ? before.signed_by_guest
        : Boolean(body.signedByGuest ?? before.signed_by_guest);
      const addOns = body.addOns === undefined ? null : body.addOns;
      const guestEmail = body.guestEmail === undefined ? before.guest_email : cleanText(body.guestEmail);

      if (body.status !== undefined && user.role === 'external' && body.status !== 'cancelled') {
        throw new ApiError(403, 'External staff cannot change operational status');
      }
      if (body.status !== undefined && user.role === 'internal' && !INTERNAL_STATUS_UPDATES.has(body.status)) {
        throw new ApiError(403, 'Internal staff status update not permitted');
      }
      if (body.status === 'finished_experience' && !['accepted', 'booked'].includes(before.status)) {
        throw new ApiError(403, 'Booking must be accepted before it can be finished');
      }
      if (body.signedByGuest !== undefined && !['accepted', 'booked', 'finished_experience'].includes(before.status)) {
        throw new ApiError(403, 'Booking must be accepted before it can be signed');
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
          guardian_name = $15,
          guardian_phone = $16,
          seating_setup = $17,
          photo_request = $18,
          privacy_preference = $19,
          dietary_restrictions = $20,
          reschedule_consent = $21,
          slot_status = $22,
          booking_source = $23,
          package_id = $24,
          add_ons = $25::jsonb,
          package_notes = $26,
          status = $27,
          signed_by_guest = $28,
          notes = $29,
          payment_method = $30,
          invoice_number = $31,
          billing_notes = $32,
          weather_condition = $33,
          equipment_needed = $34,
          assigned_astronomer = $35,
          assigned_butler = $36,
          setup_status = $37,
          base_total_usd = $38,
          service_charge_10_usd = $39,
          gst_17_usd = $40,
          invoice_total_usd = $41,
          operation_share_50_usd = $42,
          company_share_50_usd = $43,
          staff_commission_5_usd = $44,
          field_tip_incentive_usd = $45,
          tip_recipient = $46,
          tip_notes = $47,
          payout_status = $48,
          updated_by = $49
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
          body.childAges === undefined ? before.child_ages : cleanText(body.childAges, 120),
          body.specialOccasion === undefined ? before.special_occasion : cleanText(body.specialOccasion),
          body.guardianName === undefined ? before.guardian_name : cleanText(body.guardianName),
          body.guardianPhone === undefined ? before.guardian_phone : cleanText(body.guardianPhone),
          body.seatingSetup === undefined ? before.seating_setup : cleanText(body.seatingSetup),
          body.photoRequest === undefined ? before.photo_request : cleanText(body.photoRequest),
          body.privacyPreference === undefined ? before.privacy_preference : cleanText(body.privacyPreference),
          body.dietaryRestrictions === undefined ? before.dietary_restrictions : cleanText(body.dietaryRestrictions),
          body.rescheduleConsent === undefined ? before.reschedule_consent : cleanText(body.rescheduleConsent),
          body.slotStatus === undefined ? before.slot_status : cleanText(body.slotStatus) || 'available',
          body.bookingSource === undefined ? before.booking_source : cleanText(body.bookingSource),
          packageId,
          addOns === null ? JSON.stringify(before.add_ons || []) : JSON.stringify(addOns),
          body.packageNotes === undefined ? before.package_notes : cleanText(body.packageNotes),
          nextStatus,
          signedByGuest,
          body.notes === undefined ? before.notes : cleanText(body.notes),
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

      // Jika status berubah dari pending_review ke accepted atau rejected, kirim notifikasi balik ke staff pembuat booking jika bukan dirinya sendiri
      if (before.status === 'pending_review' && (nextStatus === 'accepted' || nextStatus === 'rejected') && before.staff_id !== user.id) {
        const isAccepted = nextStatus === 'accepted';
        await client.query(
          `INSERT INTO notifications (
            recipient_user_id, type, source_table, source_id, title, message, meta, link, created_at
          )
          VALUES ($1, 'booking', 'bookings', $2, $3, $4, $5, '/dashboard/external/bookings', now())
          ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            message = EXCLUDED.message,
            meta = EXCLUDED.meta,
            read_at = NULL,
            updated_at = now()`,
          [
            before.staff_id,
            id,
            isAccepted ? 'Booking Disetujui' : 'Booking Ditolak',
            `Booking ${before.booking_code} (${before.guest_name}) telah ${isAccepted ? 'diterima' : 'ditolak'} oleh tim operasional.`,
            `Staff Internal - ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`,
          ]
        );
      }

      await writeAudit(client, {
        actorId: user.id,
        action: 'booking.update',
        entityType: 'booking',
        entityId: id,
        beforeData: before,
        afterData: rows[0],
        request,
      });

      // Emit domain event for state transition
      let eventType = EventTypes.BOOKING_UPDATED;
      if (before.status !== nextStatus) {
        if (nextStatus === 'accepted') eventType = EventTypes.BOOKING_ACCEPTED;
        else if (nextStatus === 'finished_experience') eventType = EventTypes.BOOKING_FINISHED;
        else if (nextStatus === 'cancelled') eventType = EventTypes.BOOKING_CANCELLED;
        else if (nextStatus === 'rejected') eventType = EventTypes.BOOKING_REJECTED;
        else if (nextStatus === 'booked') eventType = EventTypes.BOOKING_BOOKED;
      }

      await emit(eventType, {
        bookingId: id,
        bookingCode: rows[0].booking_code,
        guestName: rows[0].guest_name,
        staffId: rows[0].staff_id,
        previousStatus: before.status,
        status: nextStatus,
        signedByGuest,
      }, { client, actorId: user.id });

      // Refresh CQRS read views
      await refreshAfterBookingChange(client);

      const refreshed = await client.query(`${bookingSelectQuery} WHERE b.id = $1`, [id]);
      return refreshed.rows[0];
    });

    if (!updated) return Response.json({ error: 'Booking not found' }, { status: 404 });
    return Response.json({ booking: updated });
  } catch (error) {
    return jsonError(error);
  }
}
