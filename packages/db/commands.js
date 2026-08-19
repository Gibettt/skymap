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
    await refreshMaterializedView('mv_dashboard_kpi', clientOrPool);
    await refreshMaterializedView('mv_booking_pipeline', clientOrPool);
    await refreshMaterializedView('mv_monthly_revenue', clientOrPool);
    await refreshMaterializedView('mv_staff_performance', clientOrPool);
  } catch (error) {
    console.error('[cqrs:commands] Failed to refresh views after booking change:', error);
  }
}

/**
 * Invalidate & refresh views affected by payout status changes
 */
export async function refreshAfterPayoutChange(clientOrPool) {
  try {
    await refreshMaterializedView('mv_staff_performance', clientOrPool);
    await refreshMaterializedView('mv_dashboard_kpi', clientOrPool);
  } catch (error) {
    console.error('[cqrs:commands] Failed to refresh views after payout change:', error);
  }
}

/**
 * Invalidate & refresh views affected by resort updates
 */
export async function refreshAfterResortChange(clientOrPool) {
  try {
    await refreshMaterializedView('mv_resort_analytics', clientOrPool);
    await refreshMaterializedView('mv_dashboard_kpi', clientOrPool);
  } catch (error) {
    console.error('[cqrs:commands] Failed to refresh views after resort change:', error);
  }
}

export {
  refreshMaterializedViews,
  refreshMaterializedView,
};
