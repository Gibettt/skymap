import { ApiError, assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { refreshAfterBookingChange, transaction } from "@ephemeris/db";
import { hasStoredBookingExperiences } from "@ephemeris/db/bookings";
import { bookingSelectQuery, cleanText } from "@ephemeris/db/helpers";
import { updateBookingSchema } from "@ephemeris/db/validators/booking";
import { uuidSchema } from "@ephemeris/db/validators/common";
import { EventTypes, emit } from "@ephemeris/events";
import { calculateBookingTotals } from "@ephemeris/finance";

const BOOKING_STATUSES = new Set([
  "pending",
  "active",
  "completed",
  "rejected",
  "cancelled_by_guest",
  "cancelled_weather",
  "rescheduled",
]);

export async function PATCH(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("admin.bookings", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: "Invalid booking id" }, { status: 400 });
    const id = parseId.data;
    const parsed = updateBookingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Invalid booking data", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    if (body.eventDate !== undefined || body.timeStart !== undefined || body.timeEnd !== undefined) {
      throw new ApiError(400, "Use the reschedule endpoint to change booking schedule");
    }
    if (body.status === "rescheduled") {
      throw new ApiError(400, "Use the reschedule endpoint to set rescheduled status");
    }

    const updated = await transaction(async (client) => {
      const beforeResult = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [id]);
      const before = beforeResult.rows[0];
      if (!before) return null;
      if (body.packageId && body.packageId !== before.package_id && (await hasStoredBookingExperiences(client, id))) {
        throw new ApiError(409, "The primary package is managed from the booking experience schedule");
      }
      const packageId = body.packageId || before.package_id;
      const staffId = body.staffId || before.staff_id;
      const resortId = body.resortId === undefined ? before.resort_id : body.resortId;
      const assignmentRequested =
        body.packageId !== undefined || body.staffId !== undefined || body.resortId !== undefined;
      if (assignmentRequested && !resortId) throw new ApiError(400, "Resort is required");

      const packageChanged = packageId !== before.package_id;
      const staffChanged = staffId !== before.staff_id;
      const resortChanged = resortId !== before.resort_id;
      let adultPriceUsd = Number(before.booked_adult_price_usd);
      let childPriceUsd = Number(before.booked_child_price_usd);
      let newBookedAdultPriceUsd = adultPriceUsd;
      let newBookedChildPriceUsd = childPriceUsd;
      const packageResult = await client.query("SELECT * FROM packages WHERE id = $1", [packageId]);
      const packageRow = packageResult.rows[0];
      if (!packageRow) throw new ApiError(400, "Package not found");
      if (packageChanged && !packageRow.is_active) {
        throw new ApiError(400, "Inactive packages cannot be assigned to a booking");
      }
      if ((packageChanged || resortChanged) && packageRow.resort_id && packageRow.resort_id !== resortId) {
        throw new ApiError(400, "Package is not available at the selected resort");
      }
      const isChargeable = packageRow.is_chargeable;

      if (packageChanged || (adultPriceUsd === 0 && before.base_total_usd === 0) || !adultPriceUsd) {
        adultPriceUsd = Number(packageRow.adult_price_usd);
        childPriceUsd = Number(
          packageRow.child_price_usd ?? (packageRow.package_type === "kids" ? adultPriceUsd : adultPriceUsd * 0.5),
        );
        newBookedAdultPriceUsd = adultPriceUsd;
        newBookedChildPriceUsd = childPriceUsd;
      }

      const staffResult = await client.query("SELECT role, resort_id, status FROM users WHERE id = $1", [staffId]);
      const staffRow = staffResult.rows[0];
      if (!staffRow) throw new ApiError(400, "Staff member not found");
      if ((staffChanged || resortChanged) && staffRow.status !== "active") {
        throw new ApiError(400, "Inactive staff members cannot be assigned to a booking");
      }
      if (
        (staffChanged || resortChanged) &&
        ["internal", "external"].includes(staffRow.role) &&
        staffRow.resort_id !== resortId
      ) {
        throw new ApiError(400, "Staff member is not assigned to the selected resort");
      }
      const staffRole = staffRow.role;

      const adultCount = body.adultCount !== undefined ? Number(body.adultCount) : Number(before.adult_count);
      const childCount = body.childCount !== undefined ? Number(body.childCount) : Number(before.child_count);
      if (adultCount + childCount <= 0) {
        throw new ApiError(400, "At least one guest is required");
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
      const signedByGuest = Boolean(body.signedByGuest ?? before.signed_by_guest);
      const addOns = body.addOns === undefined ? null : body.addOns;
      const guestEmail = body.guestEmail === undefined ? before.guest_email : cleanText(body.guestEmail);

      let assignedInternalId = before.assigned_internal_id;
      if (staffRole === "internal") {
        assignedInternalId = staffRow.id;
      } else if (before.status === "pending" && nextStatus === "active" && !assignedInternalId) {
        const internalStaff = await client.query(
          "SELECT id FROM users WHERE role = 'internal' AND status = 'active' AND resort_id = $1 LIMIT 1",
          [resortId],
        );
        if (internalStaff.rows[0]) {
          assignedInternalId = internalStaff.rows[0].id;
        }
      }

      if (!BOOKING_STATUSES.has(nextStatus)) {
        throw new ApiError(400, "Invalid booking status");
      }
      if (body.status === "completed" && !["active", "rescheduled"].includes(before.status)) {
        throw new ApiError(409, "Only active or rescheduled bookings can be completed");
      }
      if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        throw new ApiError(400, "Invalid email");
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
          staff_id = $50,
          resort_id = $51,
          assigned_internal_id = $52
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
          body.slotStatus === undefined ? before.slot_status : cleanText(body.slotStatus) || "available",
          body.bookingSource === undefined ? before.booking_source : cleanText(body.bookingSource),
          packageId,
          newBookedAdultPriceUsd,
          newBookedChildPriceUsd,
          JSON.stringify(addOns === null ? (before.add_ons || []) : addOns),
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
          body.setupStatus === undefined ? before.setup_status : cleanText(body.setupStatus) || "not_started",
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
          user.role === "admin" ? (body.payoutStatus ?? before.payout_status) : before.payout_status,
          user.id,
          staffId,
          resortId,
          assignedInternalId,
        ],
      );

      await writeAudit(client, {
        actorId: user.id,
        action: "booking.update",
        entityType: "booking",
        entityId: id,
        beforeData: before,
        afterData: rows[0],
        request,
      });

      // Emit domain event based on status transition
      let eventType = EventTypes.BOOKING_UPDATED;
      if (before.status !== nextStatus) {
        if (nextStatus === "active") eventType = EventTypes.BOOKING_ACTIVATED;
        else if (nextStatus === "completed") eventType = EventTypes.BOOKING_COMPLETED;
        else if (nextStatus.startsWith("cancelled_") || nextStatus === "rejected") eventType = EventTypes.BOOKING_CANCELLED;
        else if (nextStatus === "rescheduled") eventType = EventTypes.BOOKING_RESCHEDULED;
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

      // Trigger CQRS read view refresh
      await refreshAfterBookingChange(client);

      const refreshed = await client.query(`${bookingSelectQuery} WHERE b.id = $1`, [id]);
      return refreshed.rows[0];
    });

    if (!updated) return Response.json({ error: "Booking not found" }, { status: 404 });
    return Response.json({ booking: updated });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("admin.bookings", ["admin"], { write: true });
    const { id: rawId } = await params;
    const parseId = uuidSchema.safeParse(rawId);
    if (!parseId.success) return Response.json({ error: "Invalid booking id" }, { status: 400 });

    const deleted = await transaction(async (client) => {
      const beforeResult = await client.query("SELECT * FROM bookings WHERE id = $1 FOR UPDATE", [parseId.data]);
      const before = beforeResult.rows[0];
      if (!before) return null;

      const invoiceResult = await client.query("SELECT invoice_number FROM invoices WHERE booking_id = $1 LIMIT 1", [
        before.id,
      ]);
      if (invoiceResult.rows[0]) {
        throw new ApiError(
          409,
          `Booking ${before.booking_code} has issued invoice ${invoiceResult.rows[0].invoice_number} and cannot be deleted.`,
        );
      }

      await writeAudit(client, {
        actorId: user.id,
        action: "booking.delete",
        entityType: "booking",
        entityId: before.id,
        beforeData: before,
        request,
      });
      await client.query(`DELETE FROM notifications WHERE source_table = 'bookings' AND source_id = $1`, [before.id]);
      await client.query("DELETE FROM bookings WHERE id = $1", [before.id]);
      await refreshAfterBookingChange(client);

      return { id: before.id, bookingCode: before.booking_code };
    });

    if (!deleted) return Response.json({ error: "Booking not found" }, { status: 404 });
    return Response.json({ booking: deleted });
  } catch (error) {
    return jsonError(error);
  }
}
