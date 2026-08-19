import { query as defaultQuery } from './index.js';

/**
 * CQRS Read Model Queries
 * Reads optimized data from PostgreSQL Materialized Views.
 */

/**
 * Retrieve high-level executive KPI overview from mv_dashboard_kpi
 */
export async function getDashboardKPI(clientOrPool) {
  const db = clientOrPool || { query: defaultQuery };
  const { rows } = await db.query(
    `SELECT
      total_bookings,
      bookings_pending_review,
      bookings_accepted,
      bookings_booked,
      bookings_finished,
      bookings_cancelled,
      bookings_rejected,
      total_revenue_usd,
      total_base_usd,
      total_service_charge,
      total_gst,
      total_operation_share,
      total_company_share,
      total_commissions_paid,
      active_staff_count,
      active_resorts_count,
      avg_guest_rating,
      bookings_this_month,
      revenue_this_month,
      refreshed_at
    FROM mv_dashboard_kpi
    WHERE kpi_key = 1`
  );
  return rows[0] || null;
}

/**
 * Retrieve staff performance leaderboard & metrics from mv_staff_performance
 */
export async function getStaffPerformance({ role, search, limit = 50, offset = 0 } = {}, clientOrPool) {
  const db = clientOrPool || { query: defaultQuery };
  const params = [];
  const conditions = [];

  if (role) {
    params.push(role);
    conditions.push(`user_role = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`user_name ILIKE $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(Math.min(100, Math.max(1, limit)));
  const limitParam = `$${params.length}`;

  params.push(Math.max(0, offset));
  const offsetParam = `$${params.length}`;

  const { rows } = await db.query(
    `SELECT
      user_id,
      user_name,
      user_role,
      resort_name,
      total_bookings_handled,
      finished_bookings,
      total_commission_usd,
      total_star_points,
      full_stars,
      star_bonus_usd,
      avg_guest_rating,
      total_guests_served,
      last_booking_date
    FROM mv_staff_performance
    ${whereClause}
    ORDER BY total_star_points DESC, finished_bookings DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params
  );

  return rows;
}

/**
 * Retrieve resort analytics from mv_resort_analytics
 */
export async function getResortAnalytics(clientOrPool) {
  const db = clientOrPool || { query: defaultQuery };
  const { rows } = await db.query(
    `SELECT
      resort_id,
      resort_name,
      resort_code,
      total_bookings,
      finished_bookings,
      cancelled_bookings,
      total_revenue_usd,
      total_operation_share,
      avg_guest_rating,
      total_guests,
      most_popular_package_name,
      active_staff_count
    FROM mv_resort_analytics
    ORDER BY total_revenue_usd DESC, total_bookings DESC`
  );
  return rows;
}

/**
 * Retrieve 12-month revenue trend from mv_monthly_revenue
 */
export async function getMonthlyRevenue({ months = 12 } = {}, clientOrPool) {
  const db = clientOrPool || { query: defaultQuery };
  const limit = Math.min(24, Math.max(1, months));
  const { rows } = await db.query(
    `SELECT
      month,
      year,
      month_number,
      booking_count,
      revenue_usd,
      base_total_usd,
      service_charge_usd,
      gst_usd,
      operation_share_usd,
      company_share_usd,
      avg_booking_value,
      guest_count
    FROM mv_monthly_revenue
    ORDER BY month ASC
    LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Retrieve booking status funnel from mv_booking_pipeline
 */
export async function getBookingPipeline(clientOrPool) {
  const db = clientOrPool || { query: defaultQuery };
  const { rows } = await db.query(
    `SELECT
      status,
      count,
      percentage_of_total,
      avg_value_usd,
      total_in_pipeline,
      conversion_rate
    FROM mv_booking_pipeline
    ORDER BY count DESC`
  );
  return rows;
}

/**
 * Triggers asynchronous / concurrent refresh of all materialized views
 */
export async function refreshMaterializedViews(clientOrPool) {
  const db = clientOrPool || { query: defaultQuery };
  try {
    await db.query(`
      REFRESH MATERIALIZED VIEW mv_dashboard_kpi;
      REFRESH MATERIALIZED VIEW mv_booking_pipeline;
      REFRESH MATERIALIZED VIEW mv_monthly_revenue;
      REFRESH MATERIALIZED VIEW mv_staff_performance;
      REFRESH MATERIALIZED VIEW mv_resort_analytics;
    `);
    return true;
  } catch (error) {
    console.error('[cqrs:read-models] Failed to refresh materialized views:', error);
    return false;
  }
}

/**
 * Triggers refresh of a single materialized view
 */
export async function refreshMaterializedView(viewName, clientOrPool) {
  const db = clientOrPool || { query: defaultQuery };
  const savepoint = `sp_refresh_${viewName}`;
  try {
    await db.query(`SAVEPOINT ${savepoint}`);
    await db.query(`REFRESH MATERIALIZED VIEW ${viewName}`);
    await db.query(`RELEASE SAVEPOINT ${savepoint}`);
    return true;
  } catch (error) {
    await db.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
    console.error(`[cqrs:read-models] Failed to refresh view ${viewName}:`, error.message);
    return false;
  }
}
