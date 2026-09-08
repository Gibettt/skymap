import { z } from "zod";
import {
	cleanListSchema,
	cleanTextSchema,
	dateSchema,
	emailSchema,
	moneySchema,
	timeSchema,
	uuidSchema,
} from "./common.js";

const optionalEmailSchema = z
	.preprocess(
		(value) => (value === "" ? null : value),
		emailSchema.optional().nullable(),
	)
	.transform((value) => value || null);

const bookingStatusSchema = z.enum([
	"pending",
	"active",
	"completed",
	"rejected",
	"cancelled_by_guest",
	"cancelled_weather",
	"rescheduled",
]);
const payoutStatusSchema = z.enum([
	"commission_pending",
	"commission_approved",
	"commission_paid",
]);
const countSchema = z.coerce.number().int().min(0);
const hasIncreasingTimeRange = (data) => data.timeEnd > data.timeStart;

const bookingParticipantSchema = z
	.object({
		fullName: z.string().trim().min(1, "Participant name is required").max(200),
		type: z.enum(["adult", "child"]),
		age: z.preprocess(
			(value) => (value === "" || value == null ? null : value),
			z.coerce.number().int().min(0).max(120).nullable(),
		),
		nationality: z
			.string()
			.trim()
			.min(1, "Participant nationality is required")
			.max(80),
		notes: cleanTextSchema(500),
	})
	.superRefine((participant, context) => {
		if (participant.type === "child" && participant.age == null) {
			context.addIssue({
				code: "custom",
				message: "Child age is required",
				path: ["age"],
			});
		}
	});

const bookingParticipantsSchema = z
	.array(bookingParticipantSchema)
	.min(1)
	.max(20);

const bookingExperienceSchema = z
	.object({
		packageId: uuidSchema,
		skyEventId: uuidSchema.optional().nullable(),
		eventDate: dateSchema,
		timeStart: timeSchema,
		timeEnd: timeSchema,
		observationSpot: cleanTextSchema(120),
	})
	.refine(hasIncreasingTimeRange, {
		message: "Waktu selesai harus setelah waktu mulai",
		path: ["timeEnd"],
	});

const bookingExperiencesSchema = z
	.array(bookingExperienceSchema)
	.min(1)
	.max(10);

const createShape = {
	packageId: uuidSchema,
	staffId: uuidSchema.optional(),
	eventDate: dateSchema,
	timeStart: timeSchema,
	timeEnd: timeSchema,
	guestName: z.string().trim().min(1, "Nama tamu wajib diisi").max(200),
	guestPhone: z.string().trim().min(1, "Nomor telepon wajib diisi").max(30),
	guestEmail: optionalEmailSchema,
	roomNumber: z.string().trim().min(1, "Nomor kamar wajib diisi").max(20),
	nationality: z.string().trim().min(1, "Kebangsaan wajib diisi").max(80),
	adultCount: countSchema,
	childCount: countSchema,
	fieldTipIncentiveUsd: moneySchema,
	resortId: uuidSchema.optional().nullable(),
	skyEventId: uuidSchema.optional().nullable(),
	observationSpot: cleanTextSchema(120),
	preferredLanguage: cleanTextSchema(40),
	childAges: cleanTextSchema(500),
	specialOccasion: cleanTextSchema(500),
	guardianName: cleanTextSchema(200),
	guardianPhone: cleanTextSchema(50),
	privacyPreference: cleanTextSchema(200),
	dietaryRestrictions: cleanTextSchema(500),
	rescheduleConsent: cleanTextSchema(200),
	slotStatus: cleanTextSchema(40),
	bookingSource: cleanTextSchema(80),
	addOns: cleanListSchema(50),
	packageNotes: cleanTextSchema(4000),
	notes: cleanTextSchema(2000),
	paymentMethod: cleanTextSchema(80),
	invoiceNumber: cleanTextSchema(40),
	billingNotes: cleanTextSchema(500),
	weatherCondition: cleanTextSchema(120),
	equipmentNeeded: cleanTextSchema(200),
	assignedAstronomer: cleanTextSchema(120),
	assignedButler: cleanTextSchema(120),
	setupStatus: cleanTextSchema(40),
	tipRecipient: cleanTextSchema(120),
	tipNotes: cleanTextSchema(200),
	participants: bookingParticipantsSchema.optional(),
};

export const createBookingSchema = z
	.object({
		...createShape,
		adultCount: countSchema.default(0),
		childCount: countSchema.default(0),
		fieldTipIncentiveUsd: moneySchema.default(0),
		experiences: bookingExperiencesSchema.optional(),
	})
	.refine(
		(data) =>
			(data.participants?.length ?? 0) > 0 ||
			data.adultCount + data.childCount > 0,
		{
			message: "Minimal harus ada 1 tamu (dewasa atau anak)",
			path: ["adultCount"],
		},
	)
	.refine(hasIncreasingTimeRange, {
		message: "Waktu selesai harus setelah waktu mulai",
		path: ["timeEnd"],
	});

export const updateBookingSchema = z.object({
	...Object.fromEntries(
		Object.entries(createShape).map(([key, schema]) => [
			key,
			schema.optional(),
		]),
	),
	status: bookingStatusSchema.optional(),
	signedByGuest: z.boolean().optional(),
	payoutStatus: payoutStatusSchema.optional(),
});

export const rescheduleBookingSchema = z
	.object({
		eventDate: dateSchema,
		timeStart: timeSchema,
		timeEnd: timeSchema,
		reason: cleanTextSchema(500),
	})
	.refine(hasIncreasingTimeRange, {
		message: "Waktu selesai harus setelah waktu mulai",
		path: ["timeEnd"],
	});
