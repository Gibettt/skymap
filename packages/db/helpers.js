import crypto from "crypto";

export function cleanText(value, max = 500) {
	const text = String(value ?? "").trim();
	return text ? text.slice(0, max) : null;
}

export function cleanList(value, max = 12) {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => String(item ?? "").trim())
		.filter(Boolean)
		.slice(0, max);
}

export function generateBookingCode() {
	const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
	const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
	return `LM-${datePart}-${randomPart}`;
}

export function generateFeedbackToken() {
	return `fb-${crypto.randomBytes(18).toString("hex")}`;
}

const usesMySql =
	process.env.DATABASE_URL?.startsWith("mysql://") ||
	process.env.DATABASE_URL?.startsWith("mysql2://");

const bookingParticipantsSelect = usesMySql
	? `COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', bp.id,
          'fullName', bp.full_name,
          'type', bp.participant_type,
          'age', bp.age,
          'nationality', bp.nationality,
          'notes', bp.notes,
          'sortOrder', bp.sort_order
        )
      )
      FROM booking_participants bp
      WHERE bp.booking_id = b.id
    ), JSON_ARRAY()) AS participants`
	: `COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', bp.id,
          'fullName', bp.full_name,
          'type', bp.participant_type,
          'age', bp.age,
          'nationality', bp.nationality,
          'notes', bp.notes,
          'sortOrder', bp.sort_order
        ) ORDER BY bp.sort_order
      )
      FROM booking_participants bp
      WHERE bp.booking_id = b.id
    ), '[]'::json) AS participants`;

const bookingExperiencesSelect = usesMySql
	? `COALESCE((
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'id', be.id,
          'packageId', be.package_id,
          'packageName', experience_package.name,
          'location', experience_package.location,
          'skyEventId', be.sky_event_id,
          'eventDate', be.event_date,
          'timeStart', be.time_start,
          'timeEnd', be.time_end,
          'observationSpot', be.observation_spot,
          'adultPriceUsd', be.booked_adult_price_usd,
          'childPriceUsd', be.booked_child_price_usd,
          'baseTotalUsd', be.base_total_usd,
          'sortOrder', be.sort_order
        )
      )
      FROM booking_experiences be
      JOIN packages experience_package ON experience_package.id = be.package_id
      WHERE be.booking_id = b.id
    ), JSON_ARRAY()) AS experiences`
	: `COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', be.id,
          'packageId', be.package_id,
          'packageName', experience_package.name,
          'location', experience_package.location,
          'skyEventId', be.sky_event_id,
          'eventDate', be.event_date,
          'timeStart', be.time_start,
          'timeEnd', be.time_end,
          'observationSpot', be.observation_spot,
          'adultPriceUsd', be.booked_adult_price_usd,
          'childPriceUsd', be.booked_child_price_usd,
          'baseTotalUsd', be.base_total_usd,
          'sortOrder', be.sort_order
        ) ORDER BY be.sort_order
      )
      FROM booking_experiences be
      JOIN packages experience_package ON experience_package.id = be.package_id
      WHERE be.booking_id = b.id
    ), '[]'::json) AS experiences`;

export const bookingSelectQuery = `
  SELECT
    b.*,
    p.name AS package_name,
    p.package_type,
    p.experience_type,
    p.is_chargeable,
    p.resort_id AS package_resort_id,
    p.location,
    u.name AS staff_name,
    u.role AS staff_role,
    assigned_user.name AS assigned_internal_name,
    r.name AS resort_name,
    r.code AS resort_code,
    r.location AS resort_location,
    ft.token AS feedback_token,
    ft.status AS feedback_status,
    fs.rating,
    fs.comment,
    ${bookingParticipantsSelect},
    ${bookingExperiencesSelect}
  FROM bookings b
  JOIN packages p ON p.id = b.package_id
  JOIN users u ON u.id = b.staff_id
  LEFT JOIN users assigned_user ON assigned_user.id = b.assigned_internal_id
  LEFT JOIN resorts r ON r.id = b.resort_id
  LEFT JOIN feedback_tokens ft ON ft.booking_id = b.id
  LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
`;

export function paginationFromRequest(
	request,
	defaultLimit = 50,
	maxLimit = 100,
) {
	const url = new URL(request.url);
	const page = Math.max(1, Number(url.searchParams.get("page") || 1));
	const rawLimit = Number(url.searchParams.get("limit") || defaultLimit);
	const limit = Math.min(
		Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultLimit),
		maxLimit,
	);
	return { page, limit, offset: (page - 1) * limit };
}

export function paginationMeta({ page, limit, total }) {
	return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
