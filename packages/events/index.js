import { bus, emit, on, off } from './bus.js';
import { EventTypes, events } from './definitions.js';
import {
  handleBookingCreated,
  handleBookingAccepted,
  handleBookingFinished,
} from './handlers/booking.js';
import {
  handlePayoutRequested,
  handlePayoutReviewed,
} from './handlers/payout.js';
import { insertNotification } from './handlers/notification.js';

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
  bus.on(EventTypes.BOOKING_ACCEPTED, handleBookingAccepted);
  bus.on(EventTypes.BOOKING_FINISHED, handleBookingFinished);

  // Payout handlers
  bus.on(EventTypes.PAYOUT_REQUESTED, handlePayoutRequested);
  bus.on(EventTypes.PAYOUT_APPROVED, handlePayoutReviewed);
  bus.on(EventTypes.PAYOUT_PAID, handlePayoutReviewed);
  bus.on(EventTypes.PAYOUT_REJECTED, handlePayoutReviewed);
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
