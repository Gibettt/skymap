UPDATE bookings b
SET status = 'pending_review'
FROM users u
WHERE b.created_by = u.id
  AND u.role IN ('internal', 'external')
  AND b.status = 'booked';
