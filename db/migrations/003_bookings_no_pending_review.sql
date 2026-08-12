UPDATE bookings
SET status = 'booked'
WHERE status = 'pending_review';
