import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const projectFile = (path) => new URL(`../../../${path}`, import.meta.url);

test("booking experiences belong to one booking and preserve their order", async () => {
	const files = [
		"db/schema.sql",
		"db/migrations/027_booking_experiences.sql",
		"db/mysql/schema.sql",
		"db/mysql/027_booking_experiences.sql",
	];

	for (const path of files) {
		const source = await readFile(projectFile(path), "utf8");
		assert.match(
			source,
			/CREATE TABLE IF NOT EXISTS booking_experiences/i,
			path,
		);
		assert.match(
			source,
			/booking_id[\s\S]+REFERENCES bookings\(id\) ON DELETE CASCADE/i,
			path,
		);
		assert.match(source, /booking_id, sort_order/i, path);
		assert.match(source, /CHECK \(time_end > time_start\)/i, path);
	}
});
