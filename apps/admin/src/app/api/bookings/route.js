import { assertSameOrigin, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction, refreshAfterBookingChange } from '@ephemeris/db';
import {
  bookingSelectQuery,
  generateBookingCode,
  generateFeedbackToken,
  paginationFromRequest,
  paginationMeta,
} from '@ephemeris/db/helpers';
import { createBookingSchema } from '@ephemeris/db/validators/booking';
import { emit, EventTypes } from '@ephemeris/events';
import { calculateBookingTotals } from '@ephemeris/finance';

export async function GET(request) {
  try {
    await requireUser(['admin']);
    const pagination = paginationFromRequest(request);
    const { rows } = await query(
      `${bookingSelectQuery} ORDER BY b.created_at DESC, b.event_date DESC LIMIT $1 OFFSET $2`,
      [pagination.limit, pagination.offset]
    );
    const { rows: countRows } = await query('SELECT COUNT(*) FROM bookings');
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
    const user = await requireUser(['admin']);
    const parsed = createBookingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Data booking tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const packageId = data.packageId;
    const staffId = data.staffId || user.id;

    const created = await transaction(async (client) => {
      const pkg = await client.query('SELECT * FROM packages WHERE id = $1 AND is_active = true', [packageId]);
      if (!pkg.rows[0]) throw new Error('Package not found');

      const staff = await client.query('SELECT id, role, resort_id, name FROM users WHERE id = $1 AND status = $2', [staffId, 'active']);
      const staffRow = staff.rows[0];
      if (!staffRow) throw new Error('Staff not found');
      const resortId = staffRow.role === 'external' ? staffRow.resort_id : data.resortId;

      const childPriceUsd = pkg.rows[0].child_price_usd ?? (pkg.rows[0].package_type === 'kids' ? pkg.rows[0].adult_price_usd : pkg.rows[0].adult_price_usd * 0.5);
      const totals = calculateBookingTotals({
        adultCount: data.adultCount,
        childCount: data.childCount,
        adultPriceUsd: Number(pkg.rows[0].adult_price_usd),
        childPriceUsd: Number(childPriceUsd),
        staffRole: staffRow.role,
      });

      const status = 'accepted';
      const { rows } = await client.query(
        `INSERT INTO bookings (
          booking_code, booking_date, event_date, time_start, time_end,
          guest_name, guest_phone, guest_email, preferred_language,
          room_number, nationality, adult_count, child_count, child_ages,
          special_occasion, guardian_name, guardian_phone, seating_setup, photo_request,
          privacy_preference, dietary_restrictions, reschedule_consent, slot_status,
          booking_source, package_id, add_ons, package_notes,
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
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24, $25::jsonb, $26,
          $27, $28, $29, false, $30,
          $31, $32, $33,
          $34, $35, $36, $37, $38,
          $39, $40, $41, $42,
          $43, $44, $45,
          $46, $47, $48, $49, $49
        ) RETURNING *`,
        [
          generateBookingCode(),
          data.eventDate,
          data.timeStart,
          data.timeEnd,
          data.guestName,
          data.guestPhone,
          data.guestEmail,
          data.preferredLanguage,
          data.roomNumber,
          data.nationality,
          data.adultCount,
          data.childCount,
          data.childAges,
          data.specialOccasion,
          data.guardianName,
          data.guardianPhone,
          data.seatingSetup,
          data.photoRequest,
          data.privacyPreference,
          data.dietaryRestrictions,
          data.rescheduleConsent,
          data.slotStatus || 'available',
          data.bookingSource,
          packageId,
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
          data.setupStatus || 'not_started',
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
        ]
      );

      const booking = rows[0];
      await client.query(
        'INSERT INTO feedback_tokens (booking_id, token, status) VALUES ($1, $2, $3)',
        [booking.id, generateFeedbackToken(), 'not_sent']
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'booking.create',
        entityType: 'booking',
        entityId: booking.id,
        afterData: booking,
        request,
      });

      // Emit domain event & refresh CQRS views
      await emit(EventTypes.BOOKING_CREATED, {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        guestName: booking.guest_name,
        packageName: pkg.rows[0]?.name,
        eventDate: booking.event_date,
        creatorId: user.id,
        creatorRole: user.role,
        creatorName: user.name,
        resortId: booking.resort_id,
      }, { client, actorId: user.id });

      await refreshAfterBookingChange(client);

      return booking;
    });

    return Response.json({ booking: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
