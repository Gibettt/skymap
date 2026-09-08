import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from '@ephemeris/auth';
import { refreshAfterBookingChange, transaction } from '@ephemeris/db';
import { assignedInternalAfterUpdate, canTransitionBookingStatus, hasStoredBookingExperiences } from '@ephemeris/db/bookings';
import { bookingSelectQuery, cleanText } from '@ephemeris/db/helpers';
import { canManageBooking } from '@ephemeris/db/scopes';
import { updateBookingSchema } from '@ephemeris/db/validators/booking';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { EventTypes, emit } from '@ephemeris/events';
import { calculateBookingTotals } from '@ephemeris/finance';

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission('staff.bookings', ['internal', 'external'], { write: true });
    if (user.role === 'external') throw new ApiError(403, 'External staff cannot modify bookings');
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: 'ID tidak valid' }, { status: 400 });
    const id = parseId.data;
    const parsed = updateBookingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data booking tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    if (body.eventDate !== undefined || body.timeStart !== undefined || body.timeEnd !== undefined) {
      throw new ApiError(400, 'Use the reschedule endpoint to change booking schedule');
    }

    const updated = await transaction(async (client) => {
      const beforeResult = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
      const before = beforeResult.rows[0];
      if (!before) return null;
      if (!canManageBooking(user, before)) throw new ApiError(403, 'Forbidden');

      if (body.packageId && body.packageId !== before.package_id && (await hasStoredBookingExperiences(client, id))) {
        throw new ApiError(409, 'The primary package is managed from the booking experience schedule');
      }

      const packageId = body.packageId || before.package_id;
      const packageChanged = packageId !== before.package_id;
      let adultPriceUsd = Number(before.booked_adult_price_usd);
      let childPriceUsd = Number(before.booked_child_price_usd);
      let newBookedAdultPriceUsd = adultPriceUsd;
      let newBookedChildPriceUsd = childPriceUsd;
      let isChargeable = true;

      if (packageChanged || (adultPriceUsd === 0 && before.base_total_usd === 0) || !adultPriceUsd) {
        const pkg = await client.query('SELECT * FROM packages WHERE id = $1', [packageId]);
        if (!pkg.rows[0] || pkg.rows[0].resort_id !== before.resort_id)
          throw new Error('Package not found for this resort');
        adultPriceUsd = Number(pkg.rows[0].adult_price_usd);
        childPriceUsd = Number(
          pkg.rows[0].child_price_usd ?? (pkg.rows[0].package_type === 'kids' ? adultPriceUsd : adultPriceUsd * 0.5),
        );
        newBookedAdultPriceUsd = adultPriceUsd;
        newBookedChildPriceUsd = childPriceUsd;
        isChargeable = pkg.rows[0].is_chargeable;
      } else {
        const pkg = await client.query('SELECT is_chargeable FROM packages WHERE id = $1', [packageId]);
        if (!pkg.rows[0]) throw new Error('Package not found');
        isChargeable = pkg.rows[0].is_chargeable;
      }

      const nextSkyEventId = body.skyEventId === undefined ? before.sky_event_id : body.skyEventId;
      if (nextSkyEventId) {
        const eventResult = await client.query(
          `SELECT price_override_usd FROM sky_events
           WHERE id = $1 AND resort_id = $2 AND status = 'published'
             AND (package_id IS NULL OR package_id = $3)`,
          [nextSkyEventId, before.resort_id, packageId],
        );
        if (!eventResult.rows[0]) throw new ApiError(400, 'Sky event is not available for this resort and package');
        if (eventResult.rows[0].price_override_usd != null) {
          adultPriceUsd = Number(eventResult.rows[0].price_override_usd);
          childPriceUsd = adultPriceUsd * 0.5;
          newBookedAdultPriceUsd = adultPriceUsd;
          newBookedChildPriceUsd = childPriceUsd;
        }
      }

      const staffResult = await client.query('SELECT role FROM users WHERE id = $1', [before.staff_id]);
      const staffRole = staffResult.rows[0]?.role || user.role;

      const adultCount = body.adultCount !== undefined ? Number(body.adultCount) : Number(before.adult_count);
      const childCount = body.childCount !== undefined ? Number(body.childCount) : Number(before.child_count);
      if (adultCount + childCount <= 0) {
        throw new ApiError(400, 'Minimal harus ada 1 tamu (dewasa atau anak)');
      }

      const totals = calculateBookingTotals({
        adultCount,
        childCount,
        adultPriceUsd,
        childPriceUsd,
        staffRole,
        isChargeable,
      });

      const nextStatus = body.status ?? before.status;
      const assignedInternalId = assignedInternalAfterUpdate({
        previousAssignedInternalId: before.assigned_internal_id,
        previousStatus: before.status,
        nextStatus,
        internalUserId: user.id,
      });
      const signedByGuest = Boolean(body.signedByGuest ?? before.signed_by_guest);
      const addOns = body.addOns === undefined ? null : body.addOns;
      const guestEmail = body.guestEmail === undefined ? before.guest_email : cleanText(body.guestEmail);

      if (
        body.status !== undefined &&
        body.status !== before.status &&
        !canTransitionBookingStatus(before.status, body.status)
      ) {
        throw new ApiError(409, `Booking status cannot change from ${before.status} to ${body.status}`);
      }
      if (body.signedByGuest !== undefined && !['active', 'rescheduled', 'completed'].includes(before.status)) {
        throw new ApiError(409, 'Booking must be active before it can be signed');
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
          privacy_preference = $17,
          dietary_restrictions = $18,
          reschedule_consent = $19,
          slot_status = $20,
          booking_source = $21,
          package_id = $22,
          booked_adult_price_usd = $23,
          booked_child_price_usd = $24,
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
          updated_by = $49,
          assigned_internal_id = $50,
          sky_event_id = $51,
          observation_spot = $52
         WHERE id = $1
         RETURNING *`,
        [
          id,
          before.event_date,
          before.time_start,
          before.time_end,
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
          body.privacyPreference === undefined ? before.privacy_preference : cleanText(body.privacyPreference),
          body.dietaryRestrictions === undefined ? before.dietary_restrictions : cleanText(body.dietaryRestrictions),
          body.rescheduleConsent === undefined ? before.reschedule_consent : cleanText(body.rescheduleConsent),
          body.slotStatus === undefined ? before.slot_status : cleanText(body.slotStatus) || 'available',
          body.bookingSource === undefined ? before.booking_source : cleanText(body.bookingSource),
          packageId,
          newBookedAdultPriceUsd,
          newBookedChildPriceUsd,
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
          assignedInternalId,
          nextSkyEventId,
          body.observationSpot === undefined ? before.observation_spot : cleanText(body.observationSpot, 120),
        ],
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

      // Emit domain event for state transition
      let eventType = EventTypes.BOOKING_UPDATED;
      if (before.status !== nextStatus) {
        if (nextStatus === 'active') eventType = EventTypes.BOOKING_ACTIVATED;
        else if (nextStatus === 'completed') eventType = EventTypes.BOOKING_COMPLETED;
        else if (nextStatus.startsWith('cancelled_')) eventType = EventTypes.BOOKING_CANCELLED;
      }

      await emit(
        eventType,
        {
          bookingId: id,
          bookingCode: rows[0].booking_code,
          guestName: rows[0].guest_name,
          staffId: rows[0].staff_id,
          previousStatus: before.status,
          status: nextStatus,
          signedByGuest,
        },
        { client, actorId: user.id },
      );

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
