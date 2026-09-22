import { ApiError, jsonError, requirePermission } from '@ephemeris/auth';
import { isMySql, query } from '@ephemeris/db';
import { uuidSchema } from '@ephemeris/db/validators/common';

const MAX_RANGE_MS = 400 * 24 * 60 * 60 * 1000;

function parseRange(request) {
  const url = new URL(request.url);
  const startsAt = new Date(url.searchParams.get('start') || '');
  const endsAt = new Date(url.searchParams.get('end') || '');
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    throw new ApiError(400, 'Invalid calendar date range');
  }
  if (endsAt.getTime() - startsAt.getTime() > MAX_RANGE_MS) {
    throw new ApiError(400, 'Calendar range cannot exceed 400 days');
  }

  const rawResortId = url.searchParams.get('resortId');
  if (!rawResortId) return { startsAt, endsAt, resortId: null };
  const parsedResortId = uuidSchema.safeParse(rawResortId);
  if (!parsedResortId.success) throw new ApiError(400, 'Invalid resort ID');
  return { startsAt, endsAt, resortId: parsedResortId.data };
}

function iso(value) {
  return new Date(value).toISOString();
}

export async function GET(request) {
  try {
    await requirePermission('admin.calendar', ['admin']);
    const { startsAt, endsAt, resortId } = parseRange(request);
    const parameters = [startsAt, endsAt, resortId];
    const bookingQuery = isMySql()
      ? `SELECT b.id, b.booking_code, b.event_date, b.time_start, b.time_end,
          b.guest_name, b.guest_phone, b.guest_email, b.adult_count, b.child_count,
          b.status, b.invoice_total_usd, b.notes, b.resort_id,
          p.name AS package_name, u.name AS staff_name, r.name AS resort_name,
          CONVERT_TZ(
            TIMESTAMP(b.event_date, COALESCE(b.time_start, CAST('00:00:00' AS TIME))),
            COALESCE(r.timezone, 'UTC'), '+00:00'
          ) AS starts_at,
          CONVERT_TZ(
            TIMESTAMP(b.event_date, COALESCE(b.time_end, ADDTIME(b.time_start, '01:00:00'), CAST('01:00:00' AS TIME)))
              + INTERVAL (CASE WHEN b.time_end IS NOT NULL AND b.time_end <= b.time_start THEN 1 ELSE 0 END) DAY,
            COALESCE(r.timezone, 'UTC'), '+00:00'
          ) AS ends_at
        FROM bookings b
        JOIN packages p ON p.id = b.package_id
        JOIN users u ON u.id = b.staff_id
        LEFT JOIN resorts r ON r.id = b.resort_id
        WHERE b.event_date >= DATE(CONVERT_TZ($1, '+00:00', COALESCE(r.timezone, 'UTC')))
          AND b.event_date < DATE(CONVERT_TZ($2, '+00:00', COALESCE(r.timezone, 'UTC')))
          AND ($3 IS NULL OR b.resort_id = $3)
        ORDER BY b.event_date, b.time_start, b.booking_code`
      : `SELECT b.id, b.booking_code, b.event_date, b.time_start, b.time_end,
          b.guest_name, b.guest_phone, b.guest_email, b.adult_count, b.child_count,
          b.status, b.invoice_total_usd, b.notes, b.resort_id,
          p.name AS package_name, u.name AS staff_name, r.name AS resort_name,
          ((b.event_date + COALESCE(b.time_start, TIME '00:00'))
            AT TIME ZONE COALESCE(r.timezone, 'UTC')) AS starts_at,
          ((b.event_date
            + CASE
                WHEN b.time_end IS NOT NULL AND b.time_end <= COALESCE(b.time_start, TIME '00:00') THEN 1
                ELSE 0
              END
            + COALESCE(b.time_end, b.time_start + INTERVAL '1 hour', TIME '01:00'))
            AT TIME ZONE COALESCE(r.timezone, 'UTC')) AS ends_at
        FROM bookings b
        JOIN packages p ON p.id = b.package_id
        JOIN users u ON u.id = b.staff_id
        LEFT JOIN resorts r ON r.id = b.resort_id
        WHERE b.event_date >= ($1::timestamptz AT TIME ZONE COALESCE(r.timezone, 'UTC'))::date
          AND b.event_date < ($2::timestamptz AT TIME ZONE COALESCE(r.timezone, 'UTC'))::date
          AND ($3::uuid IS NULL OR b.resort_id = $3)
        ORDER BY b.event_date, b.time_start, b.booking_code`;
    const [bookings, skyEvents] = await Promise.all([
      query(bookingQuery, parameters),
      query(
        `SELECT se.id, se.title, se.event_type, se.starts_at, se.ends_at, se.description,
          se.source_name, se.source_url, se.visibility, se.resort_id, se.package_id,
          se.observation_spot, se.capacity, se.price_override_usd, se.image_url,
          se.image_data IS NOT NULL AS has_image,
          se.status, se.is_published, se.created_at, se.updated_at,
          r.name AS resort_name, p.name AS package_name
        FROM sky_events se
        JOIN resorts r ON r.id = se.resort_id
        LEFT JOIN packages p ON p.id = se.package_id
        WHERE se.starts_at < $2::timestamptz
          AND COALESCE(se.ends_at, se.starts_at + INTERVAL '1 hour') > $1::timestamptz
          AND ($3::uuid IS NULL OR se.resort_id = $3)
        ORDER BY se.starts_at, se.title`,
        parameters,
      ),
    ]);

    return Response.json({
      events: [
        ...bookings.rows.map((booking) => ({
          kind: 'booking',
          id: booking.id,
          title: `${booking.booking_code} · ${booking.guest_name}`,
          startsAt: iso(booking.starts_at),
          endsAt: iso(booking.ends_at),
          bookingCode: booking.booking_code,
          eventDate: booking.event_date,
          timeStart: booking.time_start,
          timeEnd: booking.time_end,
          guestName: booking.guest_name,
          guestPhone: booking.guest_phone,
          guestEmail: booking.guest_email,
          adultCount: Number(booking.adult_count),
          childCount: Number(booking.child_count),
          status: booking.status,
          invoiceTotalUsd: Number(booking.invoice_total_usd),
          notes: booking.notes,
          resortId: booking.resort_id,
          resortName: booking.resort_name,
          packageName: booking.package_name,
          staffName: booking.staff_name,
        })),
        ...skyEvents.rows.map((event) => ({
          kind: 'sky_event',
          id: event.id,
          title: event.title,
          startsAt: iso(event.starts_at),
          endsAt: event.ends_at ? iso(event.ends_at) : null,
          eventType: event.event_type,
          description: event.description || '',
          sourceName: event.source_name || '',
          sourceUrl: event.source_url,
          visibility: event.visibility,
          resortId: event.resort_id,
          resortName: event.resort_name,
          packageId: event.package_id,
          packageName: event.package_name,
          observationSpot: event.observation_spot || '',
          capacity: event.capacity == null ? null : Number(event.capacity),
          priceOverrideUsd: event.price_override_usd == null ? null : Number(event.price_override_usd),
          imageUrl: event.has_image ? `/api/sky-events/${event.id}/image` : event.image_url,
          status: event.status,
          isPublished: event.is_published,
          createdAt: iso(event.created_at),
          updatedAt: iso(event.updated_at),
        })),
      ],
    });
  } catch (error) {
    return jsonError(error);
  }
}
