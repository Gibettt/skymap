import assert from "node:assert/strict";
import test from "node:test";

import {
	bookingCreationInputForStaff,
	bookingParticipantSummary,
	bookingResponseForStaff,
	canRescheduleBookingStatus,
	canTransitionBookingStatus,
	combineBookingTotals,
} from "../bookings.js";
import {
	createBookingSchema,
	rescheduleBookingSchema,
} from "../validators/booking.js";

const terminalStatuses = [
	"completed",
	"rejected",
	"cancelled_by_guest",
	"cancelled_weather",
];

test("booking status transitions follow the operational lifecycle", () => {
	assert.equal(canTransitionBookingStatus("pending", "active"), true);
	assert.equal(canTransitionBookingStatus("pending", "rejected"), true);

	for (const currentStatus of ["active", "rescheduled"]) {
		for (const nextStatus of [
			"completed",
			"cancelled_by_guest",
			"cancelled_weather",
		]) {
			assert.equal(canTransitionBookingStatus(currentStatus, nextStatus), true);
		}
	}

	assert.equal(canTransitionBookingStatus("pending", "completed"), false);
	assert.equal(canTransitionBookingStatus("active", "rejected"), false);
	assert.equal(canTransitionBookingStatus("rescheduled", "active"), false);
});

test("terminal booking statuses cannot reopen", () => {
	for (const terminalStatus of terminalStatuses) {
		for (const nextStatus of ["pending", "active", "rescheduled"]) {
			assert.equal(
				canTransitionBookingStatus(terminalStatus, nextStatus),
				false,
			);
		}
	}
});

test("only active and already rescheduled bookings can be rescheduled", () => {
	assert.equal(canRescheduleBookingStatus("active"), true);
	assert.equal(canRescheduleBookingStatus("rescheduled"), true);

	for (const status of ["pending", ...terminalStatuses]) {
		assert.equal(canRescheduleBookingStatus(status), false);
	}
});

test("external booking responses exclude internal and credential fields", () => {
	const booking = {
		id: "booking-1",
		booking_code: "EPH-001",
		guest_name: "Guest",
		participants: [
			{ fullName: "Guest", type: "adult", age: null, nationality: "Maldivian" },
		],
		experiences: [{ packageName: "Stargazing", eventDate: "2026-08-30" }],
		invoice_total_usd: "125.00",
		staff_commission_5_usd: "6.25",
		feedback_token: "secret-feedback-token",
		assigned_internal_id: "internal-1",
		assigned_internal_name: "Internal Staff",
		payment_method: "Room charge",
		invoice_number: "INV-001",
		billing_notes: "Internal billing note",
		operation_share_50_usd: "50.00",
		company_share_50_usd: "50.00",
		field_tip_incentive_usd: "10.00",
		tip_recipient: "Guide",
		tip_notes: "Internal tip note",
		payout_status: "commission_pending",
		created_by: "external-1",
		updated_by: "internal-1",
		notes: "Internal operational note",
	};

	assert.deepEqual(bookingResponseForStaff({ role: "external" }, booking), {
		id: "booking-1",
		booking_code: "EPH-001",
		guest_name: "Guest",
		participants: [
			{ fullName: "Guest", type: "adult", age: null, nationality: "Maldivian" },
		],
		experiences: [{ packageName: "Stargazing", eventDate: "2026-08-30" }],
		invoice_total_usd: "125.00",
		staff_commission_5_usd: "6.25",
	});
});

test("internal booking responses keep the complete database row", () => {
	const booking = { id: "booking-1", feedback_token: "internal-use-only" };
	assert.equal(bookingResponseForStaff({ role: "internal" }, booking), booking);
});

test("external booking creation cannot set internal operational or finance controls", () => {
	const submitted = {
		guestName: "Guest",
		paymentMethod: "Room charge",
		notes: "Guest needs wheelchair access",
		invoiceNumber: "FORGED-001",
		billingNotes: "Skip verification",
		weatherCondition: "Clear",
		equipmentNeeded: "Premium telescope",
		assignedAstronomer: "Someone else",
		assignedButler: "Someone else",
		setupStatus: "completed",
		fieldTipIncentiveUsd: 999,
		tipRecipient: "External actor",
		tipNotes: "Forged incentive",
	};

	assert.deepEqual(
		bookingCreationInputForStaff({ role: "external" }, submitted),
		{
			guestName: "Guest",
			paymentMethod: "Room charge",
			notes: "Guest needs wheelchair access",
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
		},
	);
	assert.equal(
		bookingCreationInputForStaff({ role: "internal" }, submitted),
		submitted,
	);
});

const createPayload = {
	packageId: "11111111-1111-4111-8111-111111111111",
	eventDate: "2026-08-30",
	timeStart: "19:00",
	timeEnd: "20:00",
	guestName: "Guest",
	guestPhone: "+960 7000000",
	roomNumber: "101",
	nationality: "Maldivian",
	adultCount: 1,
	childCount: 0,
};

test("booking creation requires an end time after the start time", () => {
	assert.equal(createBookingSchema.safeParse(createPayload).success, true);
	assert.equal(
		createBookingSchema.safeParse({ ...createPayload, timeEnd: "19:00" })
			.success,
		false,
	);
	assert.equal(
		createBookingSchema.safeParse({ ...createPayload, timeEnd: "18:59" })
			.success,
		false,
	);
});

test("participant details validate and produce aggregate booking counts", () => {
	const participants = [
		{
			fullName: "Primary Guest",
			type: "adult",
			age: null,
			nationality: "Indonesian",
			notes: null,
		},
		{
			fullName: "Second Adult",
			type: "adult",
			age: 35,
			nationality: "Maldivian",
			notes: null,
		},
		{
			fullName: "Child Guest",
			type: "child",
			age: 9,
			nationality: "Indonesian",
			notes: "Needs a step stool",
		},
	];
	const parsed = createBookingSchema.safeParse({
		...createPayload,
		adultCount: 0,
		participants,
	});

	assert.equal(parsed.success, true);
	assert.deepEqual(bookingParticipantSummary(participants), {
		primary: participants[0],
		adultCount: 2,
		childCount: 1,
		childAges: "9",
	});
});

test("participant validation requires child age and limits one booking to twenty participants", () => {
	const childWithoutAge = {
		fullName: "Child Guest",
		type: "child",
		age: null,
		nationality: "Indonesian",
		notes: null,
	};

	assert.equal(
		createBookingSchema.safeParse({
			...createPayload,
			participants: [childWithoutAge],
		}).success,
		false,
	);
	assert.equal(
		createBookingSchema.safeParse({
			...createPayload,
			participants: Array.from({ length: 21 }, (_, index) => ({
				fullName: `Guest ${index + 1}`,
				type: "adult",
				age: null,
				nationality: "Indonesian",
				notes: null,
			})),
		}).success,
		false,
	);
});

test("multiple experience schedules validate and combine their finance totals", () => {
	const experiences = [
		{
			packageId: "11111111-1111-4111-8111-111111111111",
			eventDate: "2026-08-30",
			timeStart: "19:00",
			timeEnd: "20:00",
			observationSpot: "Beach",
		},
		{
			packageId: "22222222-2222-4222-8222-222222222222",
			eventDate: "2026-08-31",
			timeStart: "21:00",
			timeEnd: "22:30",
			observationSpot: "Observatory",
		},
	];

	assert.equal(
		createBookingSchema.safeParse({ ...createPayload, experiences }).success,
		true,
	);
	assert.deepEqual(
		combineBookingTotals([
			{
				baseTotalUsd: 100,
				serviceChargeUsd: 10,
				gstUsd: 18.7,
				invoiceTotalUsd: 128.7,
				operationShareUsd: 50,
				companyShareUsd: 50,
				staffCommissionUsd: 5,
			},
			{
				baseTotalUsd: 200,
				serviceChargeUsd: 20,
				gstUsd: 37.4,
				invoiceTotalUsd: 257.4,
				operationShareUsd: 100,
				companyShareUsd: 100,
				staffCommissionUsd: 10,
			},
		]),
		{
			baseTotalUsd: 300,
			serviceChargeUsd: 30,
			gstUsd: 56.1,
			invoiceTotalUsd: 386.1,
			operationShareUsd: 150,
			companyShareUsd: 150,
			staffCommissionUsd: 15,
		},
	);
});

test("experience schedules require increasing times and are limited to ten", () => {
	const experience = {
		packageId: "11111111-1111-4111-8111-111111111111",
		eventDate: "2026-08-30",
		timeStart: "19:00",
		timeEnd: "20:00",
	};

	assert.equal(
		createBookingSchema.safeParse({
			...createPayload,
			experiences: [{ ...experience, timeEnd: "19:00" }],
		}).success,
		false,
	);
	assert.equal(
		createBookingSchema.safeParse({
			...createPayload,
			experiences: Array.from({ length: 11 }, () => experience),
		}).success,
		false,
	);
});

test("booking rescheduling requires an end time after the start time", () => {
	const payload = {
		eventDate: "2026-08-31",
		timeStart: "20:00",
		timeEnd: "21:00",
		reason: "Guest request",
	};

	assert.equal(rescheduleBookingSchema.safeParse(payload).success, true);
	assert.equal(
		rescheduleBookingSchema.safeParse({ ...payload, timeEnd: "20:00" }).success,
		false,
	);
	assert.equal(
		rescheduleBookingSchema.safeParse({ ...payload, timeEnd: "19:59" }).success,
		false,
	);
});
