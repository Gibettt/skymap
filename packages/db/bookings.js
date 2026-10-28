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
	"preferred_language",
	"special_occasion",
	"dietary_restrictions",
	"package_notes",
	"payment_status",
	"package_id",
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
	"staff_review",
	"created_at",
]);

export function bookingParticipantSummary(participants) {
	const normalized = Array.isArray(participants) ? participants : [];
	const adults = normalized.filter(
		(participant) =>
			participant?.type === "adult" ||
			(participant?.age != null && Number(participant.age) >= 12),
	);
	const children = normalized.filter(
		(participant) =>
			participant?.type === "child" &&
			(participant?.age == null || Number(participant.age) < 12),
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

const EXTERNAL_EDITABLE_STATUSES = new Set(["pending", "active", "rescheduled"]);

// Operational and finance controls stay with internal staff when an external edits.
const EXTERNAL_LOCKED_UPDATE_FIELDS = Object.freeze([
	"status",
	"signedByGuest",
	"payoutStatus",
	"staffId",
	"resortId",
	"invoiceNumber",
	"billingNotes",
	"weatherCondition",
	"equipmentNeeded",
	"assignedAstronomer",
	"assignedButler",
	"setupStatus",
	"fieldTipIncentiveUsd",
	"tipRecipient",
	"tipNotes",
]);

/**
 * External staff may edit their own bookings until the customer has paid,
 * because payment confirmation issues an invoice whose totals must not change.
 */
export function externalBookingEditError(user, booking) {
	if (!user?.id || booking?.staff_id !== user.id) {
		return { status: 403, error: "You can only edit bookings you created." };
	}
	if (!EXTERNAL_EDITABLE_STATUSES.has(booking.status)) {
		return {
			status: 409,
			error: "Completed, cancelled, or rejected bookings can no longer be edited.",
		};
	}
	if (booking.payment_status !== "pending") {
		return { status: 409, error: "This booking has been paid and can no longer be edited." };
	}
	return null;
}

export function bookingUpdateInputForStaff(user, input) {
	if (user?.role !== "external") return input;
	const allowed = { ...input };
	for (const field of EXTERNAL_LOCKED_UPDATE_FIELDS) delete allowed[field];
	return allowed;
}

/**
 * Price every experience of a booking against the packages of its resort.
 * Returns `{ error, status }` for invalid selections, like the invoice commands.
 * `keepInactivePackageIds` lets an existing booking keep a package that was
 * deactivated after it was booked.
 */
export async function priceBookingExperiences(
	client,
	{
		experiences,
		resortId,
		adultCount,
		childCount,
		staffRole,
		calculateTotals,
		keepInactivePackageIds = [],
	},
) {
	const keepInactive = new Set(keepInactivePackageIds.map(String));
	const prepared = [];

	for (const experience of experiences) {
		const packageResult = await client.query("SELECT * FROM packages WHERE id = $1", [
			experience.packageId,
		]);
		const packageRecord = packageResult.rows[0];
		if (
			!packageRecord ||
			packageRecord.resort_id !== resortId ||
			(!packageRecord.is_active && !keepInactive.has(String(packageRecord.id)))
		) {
			return { status: 400, error: "Package not found for this resort" };
		}

		let skyEvent = null;
		if (experience.skyEventId) {
			const eventResult = await client.query(
				`SELECT id, package_id, price_override_usd
         FROM sky_events WHERE id = $1 AND resort_id = $2 AND status = 'published'`,
				[experience.skyEventId, resortId],
			);
			skyEvent = eventResult.rows[0];
			if (!skyEvent || (skyEvent.package_id && skyEvent.package_id !== experience.packageId)) {
				return { status: 400, error: "Sky event not found for this resort and package" };
			}
		}

		const adultPriceUsd = Number(skyEvent?.price_override_usd ?? packageRecord.adult_price_usd);
		const childPriceUsd =
			skyEvent?.price_override_usd != null
				? Number(skyEvent.price_override_usd) * 0.5
				: packageRecord.package_type === "kids" && Number(packageRecord.adult_price_usd) === 0
					? Number(packageRecord.child_price_usd ?? 0)
					: Number(packageRecord.adult_price_usd) * 0.5;
		const totals = calculateTotals({
			adultCount,
			childCount,
			adultPriceUsd,
			childPriceUsd,
			staffRole,
			isChargeable: packageRecord.is_chargeable,
		});

		prepared.push({
			...experience,
			package: packageRecord,
			adultPriceUsd,
			childPriceUsd,
			baseTotalUsd: totals.baseTotalUsd,
			totals,
		});
	}

	return {
		experiences: prepared,
		totals: combineBookingTotals(prepared.map((experience) => experience.totals)),
	};
}

/**
 * External staff rate the experiences they booked, once each booking is completed.
 * These reviews are kept apart from guest feedback so guest ratings stay comparable.
 */
export function staffReviewError(user, booking) {
	if (user?.role !== "external") {
		return { status: 403, error: "Only external staff can rate their completed bookings." };
	}
	if (!booking || booking.staff_id !== user.id) {
		return { status: 403, error: "You can only rate bookings you created." };
	}
	if (booking.status !== "completed") {
		return { status: 409, error: "An experience can be rated once the booking is completed." };
	}
	return null;
}

/** Adds `staff_review` ({ rating, comment, reviewerName, updatedAt } or null) to each booking. */
export async function attachStaffReviews(client, bookings) {
	if (!bookings.length) return bookings;
	const { rows } = await client.query(
		`SELECT r.booking_id, r.rating, r.comment, r.updated_at, u.name AS reviewer_name
     FROM booking_staff_reviews r
     LEFT JOIN users u ON u.id = r.reviewer_id
     WHERE r.booking_id = ANY($1::uuid[])`,
		[bookings.map((booking) => booking.id)],
	);
	const reviews = new Map(
		rows.map((row) => [
			String(row.booking_id),
			{
				rating: Number(row.rating),
				comment: row.comment ?? null,
				reviewerName: row.reviewer_name ?? null,
				updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
			},
		]),
	);
	return bookings.map((booking) => ({ ...booking, staff_review: reviews.get(String(booking.id)) ?? null }));
}
