import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../", import.meta.url);

test("PostgreSQL and MySQL schemas enforce one immutable source per invoice", async () => {
	const [postgres, mysql] = await Promise.all([
		readFile(new URL("db/migrations/028_invoices.sql", root), "utf8"),
		readFile(new URL("db/mysql/028_invoices.sql", root), "utf8"),
	]);

	for (const schema of [postgres, mysql]) {
		assert.match(schema, /CREATE TABLE IF NOT EXISTS invoices/i);
		assert.match(schema, /booking_id[\s\S]*UNIQUE/i);
		assert.match(schema, /payout_request_id[\s\S]*UNIQUE/i);
		assert.match(
			schema,
			/invoice_type = 'customer'[\s\S]*booking_id IS NOT NULL/i,
		);
		assert.match(
			schema,
			/invoice_type = 'staff_payout'[\s\S]*payout_request_id IS NOT NULL/i,
		);
		assert.match(
			schema,
			/total_usd = subtotal_usd \+ service_charge_usd \+ tax_usd/i,
		);
	}
});

test("PostgreSQL to MySQL migration preserves invoice dependencies in order", async () => {
	const migration = await readFile(
		new URL("scripts/migrate-postgres-to-mysql.mjs", root),
		"utf8",
	);
	const bookings = migration.indexOf("'bookings'");
	const experiences = migration.indexOf("'booking_experiences'");
	const payouts = migration.indexOf("'payout_requests'");
	const invoices = migration.indexOf("'invoices'");

	assert.ok(bookings >= 0 && experiences > bookings);
	assert.ok(payouts > experiences && invoices > payouts);
});

test("PostgreSQL and MySQL schemas persist an auditable customer payment confirmation", async () => {
	const [postgres, mysql] = await Promise.all([
		readFile(
			new URL("db/migrations/029_customer_payment_confirmation.sql", root),
			"utf8",
		),
		readFile(
			new URL("db/mysql/029_customer_payment_confirmation.sql", root),
			"utf8",
		),
	]);

	for (const schema of [postgres, mysql]) {
		assert.match(schema, /payment_status/i);
		assert.match(schema, /payment_confirmed_at/i);
		assert.match(schema, /payment_confirmed_by/i);
		assert.match(schema, /payment_reference/i);
		assert.match(schema, /payment_notes/i);
		assert.match(
			schema,
			/payment_status = 'pending'[\s\S]*payment_confirmed_at IS NULL/i,
		);
		assert.match(
			schema,
			/payment_status = 'paid'[\s\S]*payment_confirmed_at IS NOT NULL/i,
		);
		assert.match(schema, /invoice_type = 'customer'/i);
	}
});
