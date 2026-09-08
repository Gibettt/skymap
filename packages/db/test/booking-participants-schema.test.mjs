import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const schemaUrl = new URL("../../../db/schema.sql", import.meta.url);
const migrationUrl = new URL(
	"../../../db/migrations/025_booking_participants.sql",
	import.meta.url,
);
const mysqlSchemaUrl = new URL("../../../db/mysql/schema.sql", import.meta.url);
const mysqlMigrationUrl = new URL(
	"../../../db/mysql/025_booking_participants.sql",
	import.meta.url,
);

test("booking participants belong to one booking and cascade on booking deletion", async () => {
	const [schema, migration] = await Promise.all([
		readFile(schemaUrl, "utf8"),
		readFile(migrationUrl, "utf8"),
	]);

	for (const sql of [schema, migration]) {
		assert.match(sql, /CREATE TABLE IF NOT EXISTS booking_participants/i);
		assert.match(
			sql,
			/booking_id uuid NOT NULL REFERENCES bookings\(id\) ON DELETE CASCADE/i,
		);
		assert.match(sql, /UNIQUE \(booking_id, sort_order\)/i);
	}
});

test("MySQL booking participants keep the same booking ownership rules", async () => {
	const [schema, migration] = await Promise.all([
		readFile(mysqlSchemaUrl, "utf8"),
		readFile(mysqlMigrationUrl, "utf8"),
	]);

	for (const sql of [schema, migration]) {
		assert.match(sql, /CREATE TABLE IF NOT EXISTS booking_participants/i);
		assert.match(
			sql,
			/FOREIGN KEY \(booking_id\) REFERENCES bookings\(id\) ON DELETE CASCADE/i,
		);
		assert.match(
			sql,
			/UNIQUE KEY uq_booking_participants_order \(booking_id, sort_order\)/i,
		);
	}
});
