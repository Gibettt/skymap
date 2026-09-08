import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = (path) => new URL(`../../../${path}`, import.meta.url);

test("removed booking service fields stay out of current schemas and APIs", async () => {
	const currentFiles = [
		"db/schema.sql",
		"db/mysql/schema.sql",
		"packages/db/validators/booking.js",
		"apps/admin/src/app/api/bookings/route.js",
		"apps/admin/src/app/api/bookings/[id]/route.js",
		"apps/admin-web/src/app/api/bookings/route.js",
		"apps/admin-web/src/app/api/bookings/[id]/route.js",
		"apps/staff/src/app/api/bookings/route.js",
		"apps/staff/src/app/api/bookings/[id]/route.js",
		"apps/staff-web/src/app/api/bookings/route.js",
		"apps/staff-web/src/app/api/bookings/[id]/route.js",
		"apps/staff-web/src/app/(main)/dashboard/[role]/form-booking/_components/new-booking-form.tsx",
		"apps/staff/src/components/FamilyBookingForm.jsx",
	];

	for (const path of currentFiles) {
		const source = await readFile(projectFile(path), "utf8");
		assert.doesNotMatch(
			source,
			/seating_setup|photo_request|seatingSetup|photoRequest/i,
			path,
		);
	}
});

test("database removal migrations drop both obsolete columns", async () => {
	const migrationFiles = [
		"db/migrations/026_remove_booking_service_preferences.sql",
		"db/mysql/026_remove_booking_service_preferences.sql",
	];

	for (const path of migrationFiles) {
		const source = await readFile(projectFile(path), "utf8");
		assert.match(source, /DROP COLUMN(?: IF EXISTS)? seating_setup/i, path);
		assert.match(source, /DROP COLUMN(?: IF EXISTS)? photo_request/i, path);
	}
});
