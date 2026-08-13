import crypto from 'crypto';
import { assertSameOrigin, jsonError, requireUser, writeAudit } from '@ephemeris/auth';
import { query, transaction } from '@ephemeris/db';
import { calculateBookingTotals } from '@ephemeris/finance';

const bookingSelect = `
  SELECT
    b.*,
    p.name AS package_name,
    p.package_type,
    p.experience_type,
    p.location,
    u.name AS staff_name,
    u.role AS staff_role,
    r.name AS resort_name,
    r.code AS resort_code,
    r.location AS resort_location,
    ft.token AS feedback_token,
    ft.status AS feedback_status,
    fs.rating,
    fs.comment
  FROM bookings b
  JOIN packages p ON p.id = b.package_id
  JOIN users u ON u.id = b.staff_id
  LEFT JOIN resorts r ON r.id = b.resort_id
  LEFT JOIN feedback_tokens ft ON ft.booking_id = b.id
  LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
`;

function bookingCode() {
  return `LM-SKY-${Date.now().toString().slice(-6)}`;
}

function token() {
  return `fb-${crypto.randomBytes(18).toString('hex')}`;
}

function cleanText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function cleanList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 12);
}

export async function GET() {
  try {
    const user = await requireUser(['admin']);
    const { rows } = await query(`${bookingSelect} ORDER BY b.event_date DESC, b.created_at DESC`);
    return Response.json({ bookings: rows });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const body = await request.json();
    const packageId = String(body.packageId || '');
    const staffId = user.role === 'admin' && body.staffId ? String(body.staffId) : user.id;

    const guestName = String(body.guestName || '').trim();
    const roomNumber = String(body.roomNumber || '').trim();
    const nationality = String(body.nationality || '').trim();
    const guestPhone = cleanText(body.guestPhone);
    const guestEmail = cleanText(body.guestEmail);
    const adultCount = Number(body.adultCount || 0);
    const childCount = Number(body.childCount || 0);
    const fieldTip = Number(body.fieldTipIncentiveUsd || 0);

    if (
      !packageId ||
      !guestName ||
      !roomNumber ||
      !nationality ||
      !guestPhone ||
      adultCount + childCount <= 0 ||
      fieldTip < 0 ||
      (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))
    ) {
      return Response.json({ error: 'Invalid booking data' }, { status: 400 });
    }

    const created = await transaction(async (client) => {
      const pkg = await client.query('SELECT * FROM packages WHERE id = $1 AND is_active = true', [packageId]);
      if (!pkg.rows[0]) throw new Error('Package not found');

      const staff = await client.query('SELECT id, role, resort_id FROM users WHERE id = $1 AND status = $2', [staffId, 'active']);
      const staffRow = staff.rows[0];
      if (!staffRow) throw new Error('Staff not found');
      const resortId = staffRow.role === 'external' ? staffRow.resort_id : cleanText(body.resortId);

      const childPriceUsd = pkg.rows[0].child_price_usd ?? (pkg.rows[0].package_type === 'kids' ? pkg.rows[0].adult_price_usd : pkg.rows[0].adult_price_usd * 0.5);
      const totals = calculateBookingTotals({
        adultCount,
        childCount,
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
          bookingCode(),
          body.eventDate,
          body.timeStart,
          body.timeEnd,
          guestName,
          guestPhone,
          guestEmail,
          cleanText(body.preferredLanguage),
          roomNumber,
          nationality,
          adultCount,
          childCount,
          String(body.childAges || '').trim() || null,
          cleanText(body.specialOccasion),
          cleanText(body.guardianName),
          cleanText(body.guardianPhone),
          cleanText(body.seatingSetup),
          cleanText(body.photoRequest),
          cleanText(body.privacyPreference),
          cleanText(body.dietaryRestrictions),
          cleanText(body.rescheduleConsent),
          cleanText(body.slotStatus) || 'available',
          cleanText(body.bookingSource),
          packageId,
          JSON.stringify(cleanList(body.addOns)),
          cleanText(body.packageNotes),
          staffId,
          resortId,
          status,
          String(body.notes || '').trim() || null,
          cleanText(body.paymentMethod),
          cleanText(body.invoiceNumber),
          cleanText(body.billingNotes),
          cleanText(body.weatherCondition),
          cleanText(body.equipmentNeeded),
          cleanText(body.assignedAstronomer),
          cleanText(body.assignedButler),
          cleanText(body.setupStatus) || 'not_started',
          totals.baseTotalUsd,
          totals.serviceChargeUsd,
          totals.gstUsd,
          totals.invoiceTotalUsd,
          totals.operationShareUsd,
          totals.companyShareUsd,
          totals.staffCommissionUsd,
          fieldTip,
          cleanText(body.tipRecipient),
          cleanText(body.tipNotes),
          user.id,
        ]
      );

      const booking = rows[0];
      await client.query(
        'INSERT INTO feedback_tokens (booking_id, token, status) VALUES ($1, $2, $3)',
        [booking.id, token(), 'not_sent']
      );
      await writeAudit(client, {
        actorId: user.id,
        action: 'booking.create',
        entityType: 'booking',
        entityId: booking.id,
        afterData: booking,
        request,
      });
      return booking;
    });

    return Response.json({ booking: created }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
