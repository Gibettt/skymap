import { assertSameOrigin, jsonError, parseJsonBody, requirePermission, writeAudit } from "@ephemeris/auth";
import { query, refreshAfterBookingChange, transaction } from "@ephemeris/db";
import {
  bookingCreationInputForStaff,
  bookingCreationState,
  bookingParticipantSummary,
  bookingResponseForStaff,
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
import { bookingScopeForUser } from "@ephemeris/db/scopes";
import { createBookingSchema } from "@ephemeris/db/validators/booking";
import { EventTypes, emit } from "@ephemeris/events";
import { calculateBookingTotals } from "@ephemeris/finance";

export async function GET(request) {
  try {
    const user = await requirePermission("staff.bookings", ["internal", "external"]);
    const pagination = paginationFromRequest(request);
    const scope = bookingScopeForUser(user);
    const whereClause = `WHERE ${scope.whereClause}`;
    const params = scope.values;

    const { rows } = await query(
      `${bookingSelectQuery} ${whereClause} ORDER BY b.created_at DESC, b.event_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pagination.limit, pagination.offset],
    );
    const { rows: countRows } = await query(`SELECT COUNT(*) FROM bookings b ${whereClause}`, params);
    return Response.json({
      bookings: rows.map((booking) => bookingResponseForStaff(user, booking)),
      pagination: paginationMeta({ ...pagination, total: Number(countRows[0].count) }),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requirePermission("staff.bookings", ["internal", "external"], { write: true });
    const parsed = createBookingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: "Data booking tidak valid", details: parsed.error.flatten() }, { status: 400 });
    }
    const data = bookingCreationInputForStaff(user, parsed.data);
    const participantSummary = bookingParticipantSummary(data.participants);
    const hasParticipants = data.participants?.length > 0;
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
    const primaryRequestedExperience = requestedExperiences[0];
    const staffId = user.role === "admin" && data.staffId ? data.staffId : user.id;
    const resortId = user.resort_id;

    if (!resortId) {
      return Response.json({ error: "Staff resort profile is not configured" }, { status: 403 });
    }

    const created = await transaction(async (client) => {
      const staff = await client.query("SELECT id, role, resort_id, name FROM users WHERE id = $1 AND status = $2", [
        staffId,
        "active",
      ]);
      if (!staff.rows[0]) throw new Error("Staff not found");

      let resortName = null;
      if (resortId) {
        const resortRes = await client.query("SELECT name FROM resorts WHERE id = $1", [resortId]);
        resortName = resortRes.rows[0]?.name || null;
      }

      const preparedExperiences = [];
      for (const experience of requestedExperiences) {
        const packageResult = await client.query("SELECT * FROM packages WHERE id = $1 AND is_active = true", [
          experience.packageId,
        ]);
        const packageRecord = packageResult.rows[0];
        if (!packageRecord || packageRecord.resort_id !== resortId) {
          throw new Error("Package not found for this resort");
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
        const experienceTotals = calculateBookingTotals({
          adultCount,
          childCount,
          adultPriceUsd,
          childPriceUsd,
          staffRole: staff.rows[0].role,
          isChargeable: packageRecord.is_chargeable,
        });

        preparedExperiences.push({
          ...experience,
          package: packageRecord,
          adultPriceUsd,
          childPriceUsd,
          baseTotalUsd: experienceTotals.baseTotalUsd,
          totals: experienceTotals,
        });
      }

      const primaryExperience = preparedExperiences[0];
      const totals = combineBookingTotals(preparedExperiences.map((experience) => experience.totals));

      const { status, assignedInternalId } = bookingCreationState(user);

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
          status,
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

      const assigned = await client.query(
        `UPDATE bookings
         SET assigned_internal_id = $2, sky_event_id = $3, observation_spot = $4
         WHERE id = $1 RETURNING *`,
        [
          rows[0].id,
          assignedInternalId,
          primaryRequestedExperience.skyEventId || null,
          primaryRequestedExperience.observationSpot || null,
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

      // Notifikasi ke Admin selalu dikirim untuk semua booking baru (Internal maupun External)
      const staffRoleLabel = staff.rows[0]?.role === "internal" ? "Internal" : "External";
      const notifTitle = `Booking baru dari staff ${staffRoleLabel}`;
      const additionalExperienceLabel = preparedExperiences.length > 1 ? ` +${preparedExperiences.length - 1}` : "";
      const notifMsg = `${booking.booking_code} - ${booking.guest_name}, ${primaryExperience.package.name}${additionalExperienceLabel}`;
      const notifMeta = `${staff.rows[0]?.name || `Staff ${staffRoleLabel}`} - ${new Date(primaryExperience.eventDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`;

      // 1. Notifikasi ke Admin
      await client.query(
        `INSERT INTO notifications (
          recipient_user_id, type, source_table, source_id, title, message, meta, link, created_at
        )
        SELECT
          admin_user.id,
          'booking',
          'bookings',
          $1,
          $2,
          $3,
          $4,
          '/dashboard/admin/bookings',
          now()
        FROM users admin_user
        WHERE admin_user.role = 'admin' AND admin_user.status = 'active'
        ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
          title = EXCLUDED.title,
          message = EXCLUDED.message,
          meta = EXCLUDED.meta,
          link = EXCLUDED.link`,
        [booking.id, notifTitle, notifMsg, notifMeta],
      );

      // Internal operators at this resort receive an operational notification.
      if (user.role === "external") {
        await client.query(
          `INSERT INTO notifications (
            recipient_user_id, type, source_table, source_id, title, message, meta, link, created_at
          )
          SELECT
            internal_user.id,
            'booking',
            'bookings',
            $1,
            $2,
            $3,
            $4,
            '/dashboard/internal/bookings',
            now()
          FROM users internal_user
          WHERE internal_user.role = 'internal'
            AND internal_user.status = 'active'
            AND internal_user.resort_id = $5
          ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            message = EXCLUDED.message,
            meta = EXCLUDED.meta,
            link = EXCLUDED.link`,
          [booking.id, notifTitle, notifMsg, notifMeta, resortId],
        );
      }

      await writeAudit(client, {
        actorId: user.id,
        action: "booking.create",
        entityType: "booking",
        entityId: booking.id,
        afterData: booking,
        request,
      });

      // Emit domain event and refresh CQRS views (run outside transaction to prevent silent aborts on failure)
      emit(
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
          creatorName: staff.rows[0]?.name || user.name,
          resortName,
          resortId,
        },
        { actorId: user.id, skipLogging: true },
      ).catch(console.error);

      refreshAfterBookingChange().catch(console.error);

      const refreshed = await client.query(`${bookingSelectQuery} WHERE b.id = $1`, [booking.id]);
      return refreshed.rows[0];
    });

    return Response.json({ booking: bookingResponseForStaff(user, created) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
