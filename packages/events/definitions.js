// Domain Event Type Definitions for Ephemeris Monorepo

export const EventTypes = {
  // Booking lifecycle
  BOOKING_CREATED: 'booking.created',
  BOOKING_ACCEPTED: 'booking.accepted',
  BOOKING_REJECTED: 'booking.rejected',
  BOOKING_BOOKED: 'booking.booked',
  BOOKING_FINISHED: 'booking.finished',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_UPDATED: 'booking.updated',

  // Payout lifecycle
  PAYOUT_REQUESTED: 'payout.requested',
  PAYOUT_APPROVED: 'payout.approved',
  PAYOUT_PAID: 'payout.paid',
  PAYOUT_REJECTED: 'payout.rejected',

  // Sky events
  SKY_EVENT_CREATED: 'sky_event.created',
  SKY_EVENT_UPDATED: 'sky_event.updated',
  SKY_EVENT_DELETED: 'sky_event.deleted',

  // Package & Resort events
  PACKAGE_CREATED: 'package.created',
  PACKAGE_UPDATED: 'package.updated',
  RESORT_CREATED: 'resort.created',
  RESORT_UPDATED: 'resort.updated',

  // Feedback events
  FEEDBACK_SUBMITTED: 'feedback.submitted',
};

export const events = EventTypes;
export default EventTypes;
