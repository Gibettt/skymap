// Domain Event Type Definitions for Ephemeris Monorepo

export const EventTypes = {
  // Booking lifecycle
  BOOKING_CREATED: 'booking.created',
  BOOKING_ACTIVATED: 'booking.active',
  BOOKING_COMPLETED: 'booking.completed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_RESCHEDULED: 'booking.rescheduled',
  BOOKING_UPDATED: 'booking.updated',

  // Payout lifecycle
  PAYOUT_REQUESTED: 'payout.requested',
  PAYOUT_PROCESSED: 'payout.processed',
  PAYOUT_COMPLETED: 'payout.completed',
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

// Compatibility aliases for older consumers during rolling deployment.
EventTypes.BOOKING_ACCEPTED = EventTypes.BOOKING_ACTIVATED;
EventTypes.BOOKING_FINISHED = EventTypes.BOOKING_COMPLETED;
EventTypes.BOOKING_REJECTED = EventTypes.BOOKING_CANCELLED;
EventTypes.BOOKING_BOOKED = EventTypes.BOOKING_ACTIVATED;
EventTypes.PAYOUT_APPROVED = EventTypes.PAYOUT_PROCESSED;
EventTypes.PAYOUT_PAID = EventTypes.PAYOUT_COMPLETED;

export const events = EventTypes;
export default EventTypes;
