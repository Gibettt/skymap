import { bus, emit, on, off } from './bus.js';
import { EventTypes, events } from './definitions.js';
import {
  handleBookingCreated,
  handleBookingAccepted,
  handleBookingFinished,
  handleBookingRescheduled,
  handleBookingCancelled,
} from './handlers/booking.js';
import {
  handlePayoutRequested,
  handlePayoutReviewed,
} from './handlers/payout.js';
import { insertNotification } from './handlers/notification.js';
import {
  dueReminder,
  handleSkyEventChanged,
  REMINDER_OFFSETS_MINUTES,
  sendDueEventReminders,
} from './handlers/sky-event.js';

let initialized = false;

/**
 * Register default domain event subscribers.
 * Automatically runs once upon module import.
 */
export function setupDefaultHandlers() {
  if (initialized) return;
  initialized = true;

  // Booking handlers
  bus.on(EventTypes.BOOKING_CREATED, handleBookingCreated);
  bus.on(EventTypes.BOOKING_ACTIVATED, handleBookingAccepted);
  bus.on(EventTypes.BOOKING_COMPLETED, handleBookingFinished);
  bus.on(EventTypes.BOOKING_RESCHEDULED, handleBookingRescheduled);
  bus.on(EventTypes.BOOKING_CANCELLED, handleBookingCancelled);

  // Payout handlers
  bus.on(EventTypes.PAYOUT_REQUESTED, handlePayoutRequested);
  bus.on(EventTypes.PAYOUT_PROCESSED, handlePayoutReviewed);
  bus.on(EventTypes.PAYOUT_COMPLETED, handlePayoutReviewed);
  bus.on(EventTypes.PAYOUT_REJECTED, handlePayoutReviewed);

  // Resort events: staff hear about new, changed and cancelled sessions.
  bus.on(EventTypes.SKY_EVENT_CREATED, handleSkyEventChanged);
  bus.on(EventTypes.SKY_EVENT_UPDATED, handleSkyEventChanged);
}

// Auto-initialize default handlers
setupDefaultHandlers();

export {
  bus,
  emit,
  on,
  off,
  EventTypes,
  events,
  insertNotification,
  dueReminder,
  REMINDER_OFFSETS_MINUTES,
  sendDueEventReminders,
};

export default {
  bus,
  emit,
  on,
  off,
  EventTypes,
  events,
  setupDefaultHandlers,
};
