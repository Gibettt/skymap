import { assertSameOrigin, ApiError, jsonError, parseJsonBody, requireUser, writeAudit } from '@ephemeris/auth';
import { transaction, refreshAfterBookingChange } from '@ephemeris/db';
import { rescheduleBooking } from '@ephemeris/db/bookings';
import { rescheduleBookingSchema } from '@ephemeris/db/validators/booking';
import { uuidSchema } from '@ephemeris/db/validators/common';
import { emit, EventTypes } from '@ephemeris/events';

export async function POST(request, { params }) {
  try {
    await assertSameOrigin(request);
    const user = await requireUser(['admin']);
    const { id: rawId } = await params;
    const idResult = uuidSchema.safeParse(rawId);
    if (!idResult.success) return Response.json({ error: 'Invalid booking id' }, { status: 400 });
    const parsed = rescheduleBookingSchema.safeParse(await parseJsonBody(request));
    if (!parsed.success) {
      return Response.json({ error: 'Invalid reschedule data', details: parsed.error.flatten() }, { status: 400 });
    }

    const booking = await transaction(async (client) => {
      const beforeResult = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [idResult.data]);
      const before = beforeResult.rows[0];
      if (!before) return null;
      if (before.status === 'completed' || before.status.startsWith('cancelled_')) {
        throw new ApiError(409, 'Closed bookings cannot be rescheduled');
      }
      const after = await rescheduleBooking(client, { booking: before, userId: user.id, ...parsed.data });
      await writeAudit(client, {
        actorId: user.id,
        action: 'booking.reschedule',
        entityType: 'booking',
        entityId: before.id,
        beforeData: before,
        afterData: after,
        request,
      });
      await emit(EventTypes.BOOKING_RESCHEDULED, {
        bookingId: after.id,
        bookingCode: after.booking_code,
        staffId: after.staff_id,
        previousEventDate: before.event_date,
        eventDate: after.event_date,
        reason: parsed.data.reason,
      }, { client, actorId: user.id });
      await refreshAfterBookingChange(client);
      return after;
    });

    if (!booking) return Response.json({ error: 'Booking not found' }, { status: 404 });
    return Response.json({ booking });
  } catch (error) {
    return jsonError(error);
  }
}
