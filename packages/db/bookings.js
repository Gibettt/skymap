export function bookingCreationState(user) {
	return user.role === "external"
		? { status: "pending", assignedInternalId: null }
		: { status: "active", assignedInternalId: user.id };
}

/**
 * External staff may submit guest-facing booking details, but operational and
 * finance controls are owned by internal staff. Always derive those values on
 * the server so a handcrafted request cannot bypass the UI.
 */
export function bookingCreationInputForStaff(user, input) {
	if (user?.role !== "external") return input;

	return {
		...input,
		invoiceNumber: null,
		billingNotes: null,
		weatherCondition: null,
		equipmentNeeded: null,
		assignedAstronomer: null,
		assignedButler: null,
		setupStatus: "not_started",
		fieldTipIncentiveUsd: 0,
		tipRecipient: null,
		tipNotes: null,
	};
}

const BOOKING_STATUS_TRANSITIONS = Object.freeze({
	pending: Object.freeze(["active", "rejected"]),
	active: Object.freeze([
		"completed",
		"cancelled_by_guest",
		"cancelled_weather",
	]),
	rescheduled: Object.freeze([
		"completed",
		"cancelled_by_guest",
		"cancelled_weather",
	]),
	completed: Object.freeze([]),
	rejected: Object.freeze([]),
	cancelled_by_guest: Object.freeze([]),
	cancelled_weather: Object.freeze([]),
});

const EXTERNAL_STAFF_BOOKING_RESPONSE_FIELDS = Object.freeze([
	"id",
	"booking_code",
	"booking_date",
	"event_date",
	"time_start",
	"time_end",
	"guest_name",
	"guest_phone",
	"guest_email",
	"room_number",
	"nationality",
	"adult_count",
	"child_count",
	"booking_source",
	"status",
	"signed_by_guest",
	"invoice_total_usd",
	"staff_commission_5_usd",
	"observation_spot",
	"package_name",
	"location",
	"staff_name",
	"staff_role",
	"resort_name",
	"participants",
	"experiences",
	"created_at",
]);

export function bookingParticipantSummary(participants) {
	const normalized = Array.isArray(participants) ? participants : [];
	const adults = normalized.filter(
		(participant) => participant?.type === "adult",
	);
	const children = normalized.filter(
		(participant) => participant?.type === "child",
	);

	return {
		primary: normalized[0] ?? null,
		adultCount: adults.length,
		childCount: children.length,
		childAges: children
			.map((participant) => participant.age)
			.filter((age) => age != null)
			.join(", "),
	};
}

export async function replaceBookingParticipants(
	client,
	bookingId,
	participants,
) {
	if (!Array.isArray(participants)) return;

	await client.query("DELETE FROM booking_participants WHERE booking_id = $1", [
		bookingId,
	]);
	for (const [index, participant] of participants.entries()) {
		await client.query(
			`INSERT INTO booking_participants (
        booking_id, participant_type, full_name, age, nationality, notes, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[
				bookingId,
				participant.type,
				participant.fullName,
				participant.age ?? null,
				participant.nationality,
				participant.notes || null,
				index,
			],
		);
	}
}

const BOOKING_TOTAL_FIELDS = [
	"baseTotalUsd",
	"serviceChargeUsd",
	"gstUsd",
	"invoiceTotalUsd",
	"operationShareUsd",
	"companyShareUsd",
	"staffCommissionUsd",
];

export function combineBookingTotals(items) {
	return BOOKING_TOTAL_FIELDS.reduce((combined, field) => {
		const total = items.reduce(
			(sum, item) => sum + Number(item?.[field] ?? 0),
			0,
		);
		combined[field] = Number(total.toFixed(2));
		return combined;
	}, {});
}

export async function replaceBookingExperiences(
	client,
	bookingId,
	experiences,
) {
	if (!Array.isArray(experiences)) return;

	await client.query("DELETE FROM booking_experiences WHERE booking_id = $1", [
		bookingId,
	]);
	for (const [index, experience] of experiences.entries()) {
		await client.query(
			`INSERT INTO booking_experiences (
        booking_id, package_id, sky_event_id, event_date, time_start, time_end,
        observation_spot, booked_adult_price_usd, booked_child_price_usd,
        base_total_usd, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			[
				bookingId,
				experience.packageId,
				experience.skyEventId || null,
				experience.eventDate,
				experience.timeStart,
				experience.timeEnd,
				experience.observationSpot || null,
				experience.adultPriceUsd,
				experience.childPriceUsd,
				experience.baseTotalUsd,
				index,
			],
		);
	}
}

export async function hasStoredBookingExperiences(client, bookingId) {
	const { rows } = await client.query(
		"SELECT COUNT(*) AS count FROM booking_experiences WHERE booking_id = $1",
		[bookingId],
	);
	return Number(rows[0]?.count ?? 0) > 0;
}

/**
 * Return whether a booking may move from one persisted status to another.
 * Rescheduling is intentionally handled by its dedicated command so that the
 * schedule history and `rescheduled` status are written atomically.
 */
export function canTransitionBookingStatus(previousStatus, nextStatus) {
	return (
		BOOKING_STATUS_TRANSITIONS[previousStatus]?.includes(nextStatus) ?? false
	);
}

export function canRescheduleBookingStatus(status) {
	return status === "active" || status === "rescheduled";
}

/**
 * Restrict external staff responses to fields used by their booking UI. The
 * allow-list deliberately excludes feedback credentials, internal assignment,
 * audit actors, operational notes, billing/tip metadata, and internal finance
 * breakdowns. Unknown roles receive the restricted shape by default.
 */
export function bookingResponseForStaff(user, booking) {
	if (!booking || typeof booking !== "object") return booking;
	if (user?.role === "internal" || user?.role === "admin") return booking;

	return Object.fromEntries(
		EXTERNAL_STAFF_BOOKING_RESPONSE_FIELDS.filter((field) =>
			Object.hasOwn(booking, field),
		).map((field) => [field, booking[field]]),
	);
}

export function assignedInternalAfterUpdate({
	previousAssignedInternalId,
	previousStatus,
	nextStatus,
	internalUserId,
}) {
	return previousStatus === "pending" && nextStatus === "active"
		? internalUserId
		: previousAssignedInternalId;
}

/**
 * Persist a booking reschedule while retaining an immutable history row.
 * Callers must authorize the actor before invoking this command.
 */
export async function rescheduleBooking(
	client,
	{ booking, userId, eventDate, timeStart, timeEnd, reason },
) {
	await client.query(
		`INSERT INTO booking_reschedule_history (
      booking_id, previous_event_date, previous_time_start, previous_time_end,
      new_event_date, new_time_start, new_time_end, reason, changed_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		[
			booking.id,
			booking.event_date,
			booking.time_start,
			booking.time_end,
			eventDate,
			timeStart,
			timeEnd,
			reason,
			userId,
		],
	);

	const { rows } = await client.query(
		`UPDATE bookings
     SET event_date = $2,
         time_start = $3,
         time_end = $4,
         status = 'rescheduled',
         updated_by = $5
     WHERE id = $1
     RETURNING *`,
		[booking.id, eventDate, timeStart, timeEnd, userId],
	);

	const primaryExperience = await client.query(
		`SELECT id FROM booking_experiences
     WHERE booking_id = $1
     ORDER BY sort_order
     LIMIT 1`,
		[booking.id],
	);
	if (primaryExperience.rows[0]) {
		await client.query(
			`UPDATE booking_experiences
       SET event_date = $2, time_start = $3, time_end = $4
       WHERE id = $1`,
			[primaryExperience.rows[0].id, eventDate, timeStart, timeEnd],
		);
	}

	return rows[0];
}
