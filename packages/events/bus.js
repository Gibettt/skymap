import { query as defaultQuery } from '@ephemeris/db';

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe a handler to a specific event type or wildcard '*'
   * @param {string} eventType
   * @param {Function} handler (payload, context) => Promise<void> | void
   * @returns {() => void} Unsubscribe function
   */
  on(eventType, handler) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(handler);
    return () => this.off(eventType, handler);
  }

  /**
   * Unsubscribe a handler
   * @param {string} eventType
   * @param {Function} handler
   */
  off(eventType, handler) {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Emit an event. Records to domain_events table and executes subscribers.
   * @param {string} eventType - The event name
   * @param {object} payload - Event data
   * @param {object} [options]
   * @param {object} [options.client] - PostgreSQL transaction client (optional)
   * @param {string} [options.actorId] - User ID who triggered the action (optional)
   * @param {boolean} [options.skipLogging] - If true, skips domain_events persistence
   * @returns {Promise<{ id?: string, eventType: string, dispatched: number }>}
   */
  async emit(eventType, payload = {}, options = {}) {
    const { client, actorId = null, skipLogging = false } = options;
    const db = client || { query: defaultQuery };
    let eventRecordId = null;

    // 1. Durability / Event Outbox: log to domain_events table
    if (!skipLogging) {
      try {
        const { rows } = await db.query(
          `INSERT INTO domain_events (event_type, payload, actor_id, created_at)
           VALUES ($1, $2::jsonb, $3, now())
           RETURNING id`,
          [eventType, JSON.stringify(payload), actorId]
        );
        if (rows && rows[0]) {
          eventRecordId = rows[0].id;
        }
      } catch (logError) {
        // Logging error should not halt execution, but should be reported
        console.error(`[event-bus] Failed to persist domain_event '${eventType}':`, logError.message);
      }
    }

    const context = {
      eventId: eventRecordId,
      eventType,
      actorId,
      client,
      query: defaultQuery,
    };

    // 2. Dispatch to specific and wildcard listeners
    const specificHandlers = this.listeners.get(eventType) || new Set();
    const wildcardHandlers = this.listeners.get('*') || new Set();
    const allHandlers = [...specificHandlers, ...wildcardHandlers];

    for (const handler of allHandlers) {
      try {
        await handler(payload, context);
      } catch (handlerError) {
        console.error(`[event-bus] Error in handler for '${eventType}':`, handlerError);
      }
    }

    // 3. Mark processed in domain_events if recorded
    if (eventRecordId) {
      try {
        await db.query(
          `UPDATE domain_events SET processed_at = now() WHERE id = $1`,
          [eventRecordId]
        );
      } catch (_) {
        // Ignored non-critical update
      }
    }

    return {
      id: eventRecordId,
      eventType,
      dispatched: allHandlers.length,
    };
  }
}

// Singleton event bus instance
export const bus = new EventBus();
export const emit = (eventType, payload, options) => bus.emit(eventType, payload, options);
export const on = (eventType, handler) => bus.on(eventType, handler);
export const off = (eventType, handler) => bus.off(eventType, handler);

export default bus;
