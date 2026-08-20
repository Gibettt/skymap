/**
 * Persist a booking reschedule while retaining an immutable history row.
 * Callers must authorize the actor before invoking this command.
 */
export async function rescheduleBooking(client, { booking, userId, eventDate, timeStart, timeEnd, reason }) {
  await client.query(
    `INSERT INTO booking_reschedule_history (
      booking_id, previous_event_date, previous_time_start, previous_time_end,
      new_event_date, new_time_start, new_time_end, reason, changed_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      booking.id,
      booking.event_date,
      booking.time_start,
      booking.time_end,
      eventDate,
      timeStart,
      timeEnd,
      reason,
      userId,
    ]
  );

  const { rows } = await client.query(
    `UPDATE bookings
     SET event_date = $2,
         time_start = $3,
         time_end = $4,
         status = 'rescheduled',
         updated_by = $5
     WHERE id = $1
     RETURNING *`,
    [booking.id, eventDate, timeStart, timeEnd, userId]
  );

  return rows[0];
}
