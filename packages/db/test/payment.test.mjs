import assert from "node:assert/strict";
import test from "node:test";

import {
	confirmCustomerPayment,
	normalizeCustomerPaymentMethod,
	validateCustomerPaymentConfirmation,
} from "../payments.js";

const bookingId = "11111111-1111-4111-8111-111111111111";
const adminId = "22222222-2222-4222-8222-222222222222";

function booking(overrides = {}) {
	return {
		id: bookingId,
		status: "active",
		invoice_total_usd: "127.00",
		payment_status: "pending",
		payment_method: "Bank transfer",
		payment_reference: null,
		...overrides,
	};
}

test("customer payment methods are normalized to the two supported values", () => {
	assert.equal(
		normalizeCustomerPaymentMethod(" bank TRANSFER "),
		"Bank transfer",
	);
	assert.equal(normalizeCustomerPaymentMethod("cash"), "Cash");
	assert.equal(normalizeCustomerPaymentMethod("Card"), null);
});

test("payment confirmation rejects invalid booking, lifecycle, amount, and method combinations", () => {
	assert.equal(validateCustomerPaymentConfirmation(null).status, 404);
	assert.equal(
		validateCustomerPaymentConfirmation(
			booking({ status: "cancelled_by_guest" }),
		).status,
		409,
	);
	assert.equal(
		validateCustomerPaymentConfirmation(booking({ invoice_total_usd: 0 }))
			.status,
		409,
	);
	assert.equal(
		validateCustomerPaymentConfirmation(booking({ payment_method: "Card" }))
			.status,
		409,
	);
	assert.equal(validateCustomerPaymentConfirmation(booking()).status, 400);
});

test("cash does not need a transfer reference, while bank transfer does", () => {
	assert.deepEqual(
		validateCustomerPaymentConfirmation(booking(), { paymentMethod: "Cash" }),
		{ paymentMethod: "Cash" },
	);
	assert.deepEqual(
		validateCustomerPaymentConfirmation(booking(), {
			paymentMethod: "Bank transfer",
			reference: "BANK-20260907-001",
		}),
		{ paymentMethod: "Bank transfer" },
	);
});

test("payment confirmation writes the immutable confirmation actor and normalized reconciliation fields", async () => {
	const queries = [];
	const updatedBooking = booking({
		payment_status: "paid",
		payment_confirmed_at: "2026-09-07T10:00:00.000Z",
		payment_confirmed_by: adminId,
		payment_reference: "BANK-001",
		payment_notes: "Verified",
	});
	const client = {
		async query(sql, params) {
			queries.push({ sql, params });
			return queries.length === 1
				? { rows: [booking()] }
				: { rows: [updatedBooking] };
		},
	};

	const result = await confirmCustomerPayment(client, {
		bookingId,
		confirmedById: adminId,
		paymentMethod: "Bank transfer",
		reference: "  BANK-001  ",
		notes: "  Verified  ",
	});

	assert.equal(result.confirmed, true);
	assert.equal(result.booking.payment_status, "paid");
	assert.match(queries[0].sql, /FOR UPDATE/i);
	assert.match(queries[1].sql, /payment_status = 'pending'/i);
	assert.deepEqual(queries[1].params, [
		bookingId,
		"Bank transfer",
		adminId,
		"BANK-001",
		"Verified",
	]);
});

test("repeating confirmation for a paid cash booking is idempotent", async () => {
	let calls = 0;
	const paidBooking = booking({
		payment_status: "paid",
		payment_method: "Cash",
		payment_confirmed_at: "2026-09-07T10:00:00.000Z",
		payment_confirmed_by: adminId,
	});
	const client = {
		async query() {
			calls += 1;
			return { rows: [paidBooking] };
		},
	};

	const result = await confirmCustomerPayment(client, {
		bookingId,
		confirmedById: adminId,
		paymentMethod: "Cash",
	});

	assert.equal(result.confirmed, false);
	assert.equal(result.booking, paidBooking);
	assert.equal(calls, 1);
});
