import assert from "node:assert/strict";
import test from "node:test";

import {
	buildCustomerLineItems,
	buildPayoutLineItems,
	invoiceNumberFor,
	issueCustomerInvoice,
	listInvoiceWorkflows,
} from "../invoices.js";
import { issueInvoiceSchema } from "../validators/invoice.js";

const bookingId = "11111111-1111-4111-8111-111111111111";
const payoutId = "22222222-2222-4222-8222-222222222222";

test("invoice numbers are deterministic, dated, and distinguish the source type", () => {
	const issuedAt = new Date("2026-09-07T10:00:00.000Z");
	assert.equal(
		invoiceNumberFor("customer", bookingId, issuedAt),
		"EPH-CUS-20260907-1111111111",
	);
	assert.equal(
		invoiceNumberFor("staff_payout", payoutId, issuedAt),
		"EPH-PAY-20260907-2222222222",
	);
});

test("customer invoice lines use persisted experience totals instead of client amounts", () => {
	const booking = {
		id: bookingId,
		package_name: "Fallback package",
		adult_count: 2,
		child_count: 1,
	};
	const lines = buildCustomerLineItems(booking, [
		{
			id: "experience-1",
			package_name: "Aurora",
			event_date: "2026-09-10",
			time_start: "20:00:00",
			time_end: "21:30:00",
			base_total_usd: "300.005",
		},
		{
			id: "experience-2",
			package_name: "Meteor",
			event_date: "2026-09-11",
			time_start: "21:00:00",
			time_end: "22:00:00",
			base_total_usd: "150.00",
		},
	]);

	assert.equal(lines.length, 2);
	assert.equal(lines[0].description, "Aurora");
	assert.match(lines[0].detail, /2 adults, 1 child/);
	assert.equal(lines[0].amount_usd, 300.01);
	assert.equal(
		lines.reduce((total, line) => total + line.amount_usd, 0),
		450.01,
	);
});

test("payout receipts contain only the amount actually paid", () => {
	const [line] = buildPayoutLineItems({
		id: payoutId,
		amount_usd: "45.50",
		commission_usd: "100.00",
		star_bonus_usd: "50.00",
		requester_role: "external",
		resort_name: "Moon Resort",
		paid_at: "2026-09-07T10:00:00.000Z",
	});

	assert.equal(line.amount_usd, 45.5);
	assert.equal(line.unit_price_usd, 45.5);
});

test("invoice API input accepts only supported types and UUID sources", () => {
	assert.equal(
		issueInvoiceSchema.safeParse({ type: "customer", sourceId: bookingId })
			.success,
		true,
	);
	assert.equal(
		issueInvoiceSchema.safeParse({ type: "staff_payout", sourceId: payoutId })
			.success,
		true,
	);
	assert.equal(
		issueInvoiceSchema.safeParse({ type: "manual", sourceId: bookingId })
			.success,
		false,
	);
	assert.equal(
		issueInvoiceSchema.safeParse({
			type: "customer",
			sourceId: "not-an-id",
			amountUsd: 1,
		}).success,
		false,
	);
});

test("customer invoices cannot be generated before payment is confirmed", async () => {
	let queryCount = 0;
	const client = {
		async query() {
			queryCount += 1;
			if (queryCount === 1) {
				return {
					rows: [
						{
							id: bookingId,
							status: "active",
							payment_status: "pending",
							payment_confirmed_at: null,
							payment_confirmed_by: null,
						},
					],
				};
			}
			return { rows: [] };
		},
	};

	const result = await issueCustomerInvoice(client, {
		bookingId,
		issuedById: "33333333-3333-4333-8333-333333333333",
	});

	assert.equal(result.status, 409);
	assert.match(result.error, /confirm the customer payment/i);
	assert.equal(queryCount, 2);
});

test("business invoice workflow lists only completed payouts with issued invoices", async () => {
	const statements = [];
	const client = {
		async query(statement) {
			statements.push(statement);
			return { rows: [] };
		},
	};

	const workflows = await listInvoiceWorkflows(client);
	const payoutStatement = statements.find((statement) => statement.includes("FROM payout_requests pr"));

	assert.deepEqual(workflows.business, []);
	assert.match(payoutStatement, /JOIN invoices i ON i\.payout_request_id = pr\.id/);
	assert.match(payoutStatement, /i\.invoice_type = 'staff_payout'/);
	assert.match(payoutStatement, /pr\.status = 'completed' AND pr\.paid_at IS NOT NULL/);
});
