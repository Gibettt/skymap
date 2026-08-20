import { insertNotification } from './notification.js';

export async function handleBookingCreated(payload, { client, query }) {
  const db = client || { query };
  const { bookingId, bookingCode, guestName, packageName, eventDate, creatorId, creatorRole, creatorName, resortName } = payload;

  try {
    // 1. Notify all active admin users
    const { rows: admins } = await db.query(
      `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
    );

    const title = creatorRole === 'external'
      ? 'Booking baru dari staff External'
      : 'Booking baru dari staff Internal';
    const message = `${bookingCode || 'Booking'} - ${guestName || 'Tamu'}${packageName ? `, ${packageName}` : ''}`;
    const meta = `${creatorName || 'Staff'} - ${eventDate ? new Date(eventDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : 'Event'}`;

    for (const admin of admins) {
      await insertNotification(db, {
        recipientUserId: admin.id,
        type: 'booking',
        sourceTable: 'bookings',
        sourceId: bookingId,
        title,
        message,
        meta,
        link: '/dashboard/admin/bookings',
      });
    }

    // 2. If created by external staff, also notify active internal astronomers
    if (creatorRole === 'external') {
      const { rows: internals } = await db.query(
        `SELECT id FROM users
         WHERE role = 'internal' AND status = 'active' AND resort_id = $1`,
        [payload.resortId]
      );

      for (const internal of internals) {
        await insertNotification(db, {
          recipientUserId: internal.id,
          type: 'booking',
          sourceTable: 'bookings',
          sourceId: bookingId,
          title: 'Booking baru dari staff External',
          message,
          meta: `${creatorName || 'Resort'} - ${resortName || 'Resort'}`,
          link: '/dashboard/internal/bookings',
        });
      }
    }
  } catch (err) {
    console.error('[events:booking:created] Error processing booking.created event:', err);
  }
}

export async function handleBookingAccepted(payload, { client, query }) {
  const db = client || { query };
  const { bookingId, bookingCode, guestName, staffId } = payload;

  if (!staffId) return;

  try {
    await insertNotification(db, {
      recipientUserId: staffId,
      type: 'booking',
      sourceTable: 'bookings',
      sourceId: bookingId,
      title: 'Booking Aktif',
      message: `Booking ${bookingCode || ''} untuk ${guestName || 'tamu'} kini aktif`,
      meta: 'Status: Active',
      link: '/dashboard/external/bookings',
    });
  } catch (err) {
    console.error('[events:booking:accepted] Error processing booking.accepted event:', err);
  }
}

export async function handleBookingFinished(payload, { client, query }) {
  const db = client || { query };
  const { bookingId, bookingCode, guestName, staffId } = payload;

  try {
    // Notify staff that experience is completed and commission is recorded
    if (staffId) {
      await insertNotification(db, {
        recipientUserId: staffId,
        type: 'booking',
        sourceTable: 'bookings',
        sourceId: bookingId,
        title: 'Pengalaman Selesai',
        message: `Booking ${bookingCode || ''} (${guestName || 'Tamu'}) selesai. Komisi telah dicatat.`,
        meta: 'Status: Completed',
        link: '/dashboard/internal/bookings',
      });
    }
  } catch (err) {
    console.error('[events:booking:finished] Error processing booking.finished event:', err);
  }
}

export async function handleBookingRescheduled(payload, { client, query }) {
  const db = client || { query };
  if (!payload.staffId) return;
  try {
    await insertNotification(db, {
      recipientUserId: payload.staffId,
      type: 'booking',
      sourceTable: 'bookings',
      sourceId: payload.bookingId,
      title: 'Booking Dijadwalkan Ulang',
      message: `Booking ${payload.bookingCode || ''} dipindahkan ke ${payload.eventDate}`,
      meta: payload.reason || 'Jadwal diperbarui',
      link: '/dashboard/external/bookings',
    });
  } catch (err) {
    console.error('[events:booking:rescheduled] Error processing event:', err);
  }
}
