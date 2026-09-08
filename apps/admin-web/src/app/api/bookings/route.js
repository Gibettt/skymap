import { assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { query, refreshAfterBookingChange, transaction } from "@ephemeris/db";
import {
  bookingParticipantSummary,
  combineBookingTotals,
  replaceBookingExperiences,
  replaceBookingParticipants,
} from "@ephemeris/db/bookings";
import {
  bookingSelectQuery,
  generateBookingCode,
  generateFeedbackToken,
  paginationFromRequest,
  paginationMeta,
} from "@ephemeris/db/helpers";
import { createBookingSchema } from "@ephemeris/db/validators/booking";
import { EventTypes, emit } from "@ephemeris/events";
import { calculateBookingTotals } from "@ephemeris/finance";

export async function GET(request) {
  try {
    await requirePermission("admin.bookings", ["admin"]);
    const pagination = paginationFromRequest(request);
    const { rows } = await query(
      `${bookingSelectQuery} ORDER BY b.created_at DESC, b.event_date DESC LIMIT $1 OFFSET $2`,
      [pagination.limit, pagination.offset],
    );
    const { rows: countRows } = await query("SELECT COUNT(*) FROM bookings");
    return Response.json({
      bookings: rows,
      pagination: paginationMeta({ ...pagination, total: Number(countRows[0].count) }),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("admin.bookings", ["admin"], { write: true });
    const parsed = createBookingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Data booking tidak valid", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const participantSummary = bookingParticipantSummary(data.participants);
    const hasParticipants = Boolean(data.participants?.length);
    const adultCount = hasParticipants ? participantSummary.adultCount : data.adultCount;
    const childCount = hasParticipants ? participantSummary.childCount : data.childCount;
    const childAges = hasParticipants ? participantSummary.childAges : data.childAges;
    const guestName = participantSummary.primary?.fullName ?? data.guestName;
    const nationality = participantSummary.primary?.nationality ?? data.nationality;
    const requestedExperiences = data.experiences?.length
      ? data.experiences
      : [
          {
            packageId: data.packageId,
            skyEventId: data.skyEventId,
            eventDate: data.eventDate,
            timeStart: data.timeStart,
            timeEnd: data.timeEnd,
            observationSpot: data.observationSpot,
          },
        ];
    const staffId = data.staffId || user.id;

    const created = await transaction(async (client) => {
      const staff = await client.query("SELECT id, role, resort_id, name FROM users WHERE id = $1 AND status = $2", [
        staffId,
        "active",
      ]);
      const staffRow = staff.rows[0];
      if (!staffRow) throw new Error("Staff not found");

      let resortId = data.resortId || staffRow.resort_id || null;
      const preparedExperiences = [];

      for (const experience of requestedExperiences) {
        const packageResult = await client.query("SELECT * FROM packages WHERE id = $1 AND is_active = true", [
          experience.packageId,
        ]);
        const packageRecord = packageResult.rows[0];
        if (!packageRecord) throw new Error("Package not found");
        if (!packageRecord.resort_id) throw new Error("Package resort is not configured");

        resortId ||= packageRecord.resort_id;
        if (packageRecord.resort_id !== resortId) {
          throw new Error("All experience packages in one booking must belong to the same resort");
        }

        let skyEvent = null;
        if (experience.skyEventId) {
          const eventResult = await client.query(
            `SELECT id, package_id, price_override_usd
             FROM sky_events WHERE id = $1 AND resort_id = $2 AND status = 'published'`,
            [experience.skyEventId, resortId],
          );
          skyEvent = eventResult.rows[0];
          if (!skyEvent || (skyEvent.package_id && skyEvent.package_id !== experience.packageId)) {
            throw new Error("Sky event not found for this resort and package");
          }
        }

        const adultPriceUsd = Number(skyEvent?.price_override_usd ?? packageRecord.adult_price_usd);
        const childPriceUsd =
          skyEvent?.price_override_usd != null
            ? Number(skyEvent.price_override_usd) * 0.5
            : Number(
                packageRecord.child_price_usd ??
                  (packageRecord.package_type === "kids"
                    ? packageRecord.adult_price_usd
                    : Number(packageRecord.adult_price_usd) * 0.5),
              );
        const totals = calculateBookingTotals({
          adultCount,
          childCount,
          adultPriceUsd,
          childPriceUsd,
          staffRole: staffRow.role,
          isChargeable: packageRecord.is_chargeable,
        });

        preparedExperiences.push({
          ...experience,
          package: packageRecord,
          adultPriceUsd,
          childPriceUsd,
          baseTotalUsd: totals.baseTotalUsd,
          totals,
        });
      }

      if (!resortId) throw new Error("Resort is required");

      const primaryExperience = preparedExperiences[0];
      const totals = combineBookingTotals(preparedExperiences.map((experience) => experience.totals));
      const { rows } = await client.query(
        `INSERT INTO bookings (
          booking_code, booking_date, event_date, time_start, time_end,
          guest_name, guest_phone, guest_email, preferred_language,
          room_number, nationality, adult_count, child_count, child_ages,
          special_occasion, guardian_name, guardian_phone,
          privacy_preference, dietary_restrictions, reschedule_consent, slot_status,
          booking_source, package_id, booked_adult_price_usd, booked_child_price_usd, add_ons, package_notes,
          staff_id, resort_id, status, signed_by_guest, notes,
          payment_method, invoice_number, billing_notes,
          weather_condition, equipment_needed, assigned_astronomer, assigned_butler, setup_status,
          base_total_usd, service_charge_10_usd, gst_17_usd, invoice_total_usd,
          operation_share_50_usd, company_share_50_usd, staff_commission_5_usd,
          field_tip_incentive_usd, tip_recipient, tip_notes, created_by, updated_by
        ) VALUES (
          $1, current_date, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19, $20,
          $21, $22, $23, $24, $25::jsonb, $26,
          $27, $28, $29, false, $30,
          $31, $32, $33,
          $34, $35, $36, $37, $38,
          $39, $40, $41, $42,
          $43, $44, $45,
          $46, $47, $48, $49, $49
        ) RETURNING *`,
        [
          generateBookingCode(),
          primaryExperience.eventDate,
          primaryExperience.timeStart,
          primaryExperience.timeEnd,
          guestName,
          data.guestPhone,
          data.guestEmail,
          data.preferredLanguage,
          data.roomNumber,
          nationality,
          adultCount,
          childCount,
          childAges,
          data.specialOccasion,
          data.guardianName,
          data.guardianPhone,
          data.privacyPreference,
          data.dietaryRestrictions,
          data.rescheduleConsent,
          data.slotStatus || "available",
          data.bookingSource,
          primaryExperience.packageId,
          primaryExperience.adultPriceUsd,
          primaryExperience.childPriceUsd,
          JSON.stringify(data.addOns),
          data.packageNotes,
          staffId,
          resortId,
          "active",
          data.notes,
          data.paymentMethod,
          data.invoiceNumber,
          data.billingNotes,
          data.weatherCondition,
          data.equipmentNeeded,
          data.assignedAstronomer,
          data.assignedButler,
          data.setupStatus || "not_started",
          totals.baseTotalUsd,
          totals.serviceChargeUsd,
          totals.gstUsd,
          totals.invoiceTotalUsd,
          totals.operationShareUsd,
          totals.companyShareUsd,
          totals.staffCommissionUsd,
          data.fieldTipIncentiveUsd,
          data.tipRecipient,
          data.tipNotes,
          user.id,
        ],
      );

      const assignedInternalId = staffRow.role === "internal" ? staffRow.id : null;
      const assigned = await client.query(
        `UPDATE bookings
         SET assigned_internal_id = $2, sky_event_id = $3, observation_spot = $4
         WHERE id = $1
         RETURNING *`,
        [
          rows[0].id,
          assignedInternalId,
          primaryExperience.skyEventId || null,
          primaryExperience.observationSpot || null,
        ],
      );
      const booking = assigned.rows[0];

      await replaceBookingParticipants(client, booking.id, data.participants);
      await replaceBookingExperiences(client, booking.id, preparedExperiences);
      await client.query("INSERT INTO feedback_tokens (booking_id, token, status) VALUES ($1, $2, $3)", [
        booking.id,
        generateFeedbackToken(),
        "not_sent",
      ]);

      const refreshed = await client.query(`${bookingSelectQuery} WHERE b.id = $1`, [booking.id]);
      const responseBooking = refreshed.rows[0];

      await writeAudit(client, {
        actorId: user.id,
        action: "booking.create",
        entityType: "booking",
        entityId: booking.id,
        afterData: responseBooking,
        request,
      });

      await emit(
        EventTypes.BOOKING_CREATED,
        {
          bookingId: booking.id,
          bookingCode: booking.booking_code,
          guestName: booking.guest_name,
          packageName: primaryExperience.package.name,
          experienceCount: preparedExperiences.length,
          eventDate: booking.event_date,
          creatorId: user.id,
          creatorRole: user.role,
          creatorName: user.name,
          resortId: booking.resort_id,
        },
        { client, actorId: user.id },
      );

      await refreshAfterBookingChange(client);
      return responseBooking;
    });

    return Response.json({ booking: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
