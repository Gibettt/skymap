import { refreshMaterializedView, refreshMaterializedViews } from './read-models.js';

/**
 * CQRS Command Helpers
 * Side-effect orchestration and view invalidation helpers after write mutations.
 */

/**
 * Invalidate & refresh views affected by booking lifecycle changes
 */
export async function refreshAfterBookingChange(clientOrPool) {
  try {
    // Non-blocking refresh of key booking views
    await Promise.allSettled([
      refreshMaterializedView('mv_dashboard_kpi', clientOrPool),
      refreshMaterializedView('mv_booking_pipeline', clientOrPool),
      refreshMaterializedView('mv_monthly_revenue', clientOrPool),
      refreshMaterializedView('mv_staff_performance', clientOrPool),
    ]);
  } catch (error) {
    console.error('[cqrs:commands] Failed to refresh views after booking change:', error);
  }
}

/**
 * Invalidate & refresh views affected by payout status changes
 */
export async function refreshAfterPayoutChange(clientOrPool) {
  try {
    await Promise.allSettled([
      refreshMaterializedView('mv_staff_performance', clientOrPool),
      refreshMaterializedView('mv_dashboard_kpi', clientOrPool),
    ]);
  } catch (error) {
    console.error('[cqrs:commands] Failed to refresh views after payout change:', error);
  }
}

/**
 * Invalidate & refresh views affected by resort updates
 */
export async function refreshAfterResortChange(clientOrPool) {
  try {
    await Promise.allSettled([
      refreshMaterializedView('mv_resort_analytics', clientOrPool),
      refreshMaterializedView('mv_dashboard_kpi', clientOrPool),
    ]);
  } catch (error) {
    console.error('[cqrs:commands] Failed to refresh views after resort change:', error);
  }
}

export {
  refreshMaterializedViews,
  refreshMaterializedView,
};
