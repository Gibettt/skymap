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
    const user = await requireUser();
    if (user.role === 'external' && !user.resort_id) {
      return Response.json({ error: 'External resort profile is not configured' }, { status: 403 });
    }
    const pagination = paginationFromRequest(request);

    let whereClause = 'WHERE b.staff_id = $1';
    let params = [user.id];
    let countSql = 'SELECT COUNT(*) FROM bookings WHERE staff_id = $1';
    let countParams = [user.id];

    if (user.role === 'internal') {
      const url = new URL(request.url);
      const filter = url.searchParams.get('filter'); // 'mine', 'pending', 'external', 'all'
      if (filter === 'mine') {
        whereClause = 'WHERE b.staff_id = $1';
        params = [user.id];
        countSql = 'SELECT COUNT(*) FROM bookings WHERE staff_id = $1';
        countParams = [user.id];
      } else if (filter === 'pending') {
        whereClause = 'WHERE b.status = $1';
        params = ['pending_review'];
        countSql = 'SELECT COUNT(*) FROM bookings WHERE status = $1';
        countParams = ['pending_review'];
      } else if (filter === 'external') {
        whereClause = 'WHERE u.role = $1';
        params = ['external'];
        countSql = 'SELECT COUNT(*) FROM bookings b JOIN users u ON u.id = b.staff_id WHERE u.role = $1';
        countParams = ['external'];
      } else {
        // 'all' / default: internal staff sees all operational bookings
        whereClause = 'WHERE 1=1';
        params = [];
        countSql = 'SELECT COUNT(*) FROM bookings';
        countParams = [];
      }
    }

    const { rows } = await query(
      `${bookingSelectQuery} ${whereClause} ORDER BY b.created_at DESC, b.event_date DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pagination.limit, pagination.offset]
    );
    const { rows: countRows } = await query(countSql, countParams);
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
    const user = await requireUser();
    console.log('[POST /api/bookings] user:', user?.id, user?.role, 'resort_id:', user?.resort_id);
    const parsed = createBookingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      console.error('[POST /api/bookings] validation error:', JSON.stringify(parsed.error.flatten()));
      return Response.json({ error: 'Data booking tidak valid', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;
    const packageId = data.packageId;
    const staffId = user.role === 'admin' && data.staffId ? data.staffId : user.id;
    const resortId = user.role === 'external' ? user.resort_id : data.resortId;

    if (user.role === 'external' && !resortId) {
      return Response.json({ error: 'External resort profile is not configured' }, { status: 403 });
    }

    const created = await transaction(async (client) => {
      const pkg = await client.query('SELECT * FROM packages WHERE id = $1 AND is_active = true', [packageId]);
      if (!pkg.rows[0]) throw new Error('Package not found');

      const staff = await client.query('SELECT id, role, resort_id, name FROM users WHERE id = $1 AND status = $2', [staffId, 'active']);
      if (!staff.rows[0]) throw new Error('Staff not found');

      let resortName = null;
      if (resortId) {
        const resortRes = await client.query('SELECT name FROM resorts WHERE id = $1', [resortId]);
        resortName = resortRes.rows[0]?.name || null;
      }

      const childPriceUsd = pkg.rows[0].child_price_usd ?? (pkg.rows[0].package_type === 'kids' ? pkg.rows[0].adult_price_usd : pkg.rows[0].adult_price_usd * 0.5);
      const totals = calculateBookingTotals({
        adultCount: data.adultCount,
        childCount: data.childCount,
        adultPriceUsd: Number(pkg.rows[0].adult_price_usd),
        childPriceUsd: Number(childPriceUsd),
        staffRole: staff.rows[0].role,
      });

      // Staff Internal: langsung diterima ('accepted') tanpa butuh review admin
      // Staff External: butuh review ('pending_review')
      const status = user.role === 'internal' ? 'accepted' : 'pending_review';

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

      // Notifikasi ke Admin selalu dikirim untuk semua booking baru (Internal maupun External)
      const staffRoleLabel = staff.rows[0]?.role === 'internal' ? 'Internal' : 'External';
      const notifTitle = `Booking baru dari staff ${staffRoleLabel}`;
      const notifMsg = `${booking.booking_code} - ${booking.guest_name}${pkg.rows[0]?.name ? ', ' + pkg.rows[0].name : ''}`;
      const notifMeta = `${staff.rows[0]?.name || `Staff ${staffRoleLabel}`} - ${new Date(data.eventDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}`;

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
        [booking.id, notifTitle, notifMsg, notifMeta]
      );

      // 2. Jika External Staff membuat booking (status pending_review), kirim juga ke Staff Internal untuk di-review
      if (status === 'pending_review') {
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
          WHERE internal_user.role = 'internal' AND internal_user.status = 'active'
          ON CONFLICT (recipient_user_id, type, source_id) DO UPDATE SET
            title = EXCLUDED.title,
            message = EXCLUDED.message,
            meta = EXCLUDED.meta,
            link = EXCLUDED.link`,
          [booking.id, notifTitle, notifMsg, notifMeta]
        );
      }

      await writeAudit(client, {
        actorId: user.id,
        action: 'booking.create',
        entityType: 'booking',
        entityId: booking.id,
        afterData: booking,
        request,
      });

      // Emit domain event and refresh CQRS views (run outside transaction to prevent silent aborts on failure)
      emit(EventTypes.BOOKING_CREATED, {
        bookingId: booking.id,
        bookingCode: booking.booking_code,
        guestName: booking.guest_name,
        packageName: pkg.rows[0]?.name,
        eventDate: booking.event_date,
        creatorId: user.id,
        creatorRole: user.role,
        creatorName: staff.rows[0]?.name || user.name,
        resortName,
        resortId,
      }, { actorId: user.id, skipLogging: true }).catch(console.error);

      refreshAfterBookingChange().catch(console.error);

      return booking;
    });

    return Response.json({ booking: created }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/bookings] error:', error?.message || error);
    return jsonError(error);
  }
}
