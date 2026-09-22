import { randomUUID } from "node:crypto";

const CUSTOMER_ELIGIBLE_STATUSES = new Set(["active", "rescheduled", "completed"]);

const roundMoney = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
};

function jsonValue(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function isoTimestamp(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export function invoiceNumberFor(type, id, issuedAt = new Date()) {
  const date = issuedAt instanceof Date ? issuedAt : new Date(issuedAt);
  if (Number.isNaN(date.getTime())) throw new TypeError("Invalid invoice issue date");
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const idPart = String(id).replaceAll("-", "").slice(0, 10).toUpperCase();
  if (idPart.length < 10) throw new TypeError("Invalid invoice identifier");
  return `EPH-${type === "staff_payout" ? "PAY" : "CUS"}-${datePart}-${idPart}`;
}

export function buildCustomerLineItems(booking, experiences = []) {
  const adultCount = Number(booking.adult_count ?? 0);
  const childCount = Number(booking.child_count ?? 0);
  const participantSummary = [
    adultCount ? `${adultCount} adult${adultCount === 1 ? "" : "s"}` : null,
    childCount ? `${childCount} child${childCount === 1 ? "" : "ren"}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const sourceItems = experiences.length
    ? experiences
    : [
        {
          id: booking.id,
          package_name: booking.package_name,
          event_date: booking.event_date,
          time_start: booking.time_start,
          time_end: booking.time_end,
          observation_spot: booking.observation_spot,
          base_total_usd: booking.base_total_usd,
        },
      ];

  return sourceItems.map((experience, index) => ({
    id: String(experience.id ?? `experience-${index + 1}`),
    description: String(experience.package_name ?? booking.package_name ?? "Ephemeris experience"),
    detail: [
      participantSummary || null,
      isoDate(experience.event_date),
      experience.time_start && experience.time_end
        ? `${String(experience.time_start).slice(0, 5)}–${String(experience.time_end).slice(0, 5)}`
        : null,
      experience.observation_spot || null,
    ]
      .filter(Boolean)
      .join(" · "),
    quantity: 1,
    unit_price_usd: roundMoney(experience.base_total_usd),
    amount_usd: roundMoney(experience.base_total_usd),
  }));
}

export function buildPayoutLineItems(payout) {
  return [
    {
      id: String(payout.id),
      description: "Staff payout settlement",
      detail: [
        payout.requester_role ? `${String(payout.requester_role)} staff` : null,
        payout.resort_name || "Internal operations",
        payout.paid_at ? `Paid ${isoDate(payout.paid_at)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      quantity: 1,
      unit_price_usd: roundMoney(payout.amount_usd),
      amount_usd: roundMoney(payout.amount_usd),
    },
  ];
}

export function normalizeInvoice(row) {
  if (!row) return null;
  return {
    ...row,
    subtotal_usd: roundMoney(row.subtotal_usd),
    service_charge_usd: roundMoney(row.service_charge_usd),
    tax_usd: roundMoney(row.tax_usd),
    tax_label: String(row.tax_label ?? "Tourism GST (TGST)"),
    tax_rate_percent: roundMoney(row.tax_rate_percent ?? 17),
    total_usd: roundMoney(row.total_usd),
    line_items: jsonValue(row.line_items, []),
    source_snapshot: jsonValue(row.source_snapshot, {}),
    issued_at: isoTimestamp(row.issued_at),
    created_at: isoTimestamp(row.created_at),
    updated_at: isoTimestamp(row.updated_at),
    due_date: isoDate(row.due_date),
  };
}

const invoiceSelect = `SELECT i.*,
  CASE WHEN i.invoice_type = 'customer' THEN b.booking_code ELSE pr.id END AS source_reference,
  issuer.name AS issuer_name
 FROM invoices i
 LEFT JOIN bookings b ON b.id = i.booking_id
 LEFT JOIN payout_requests pr ON pr.id = i.payout_request_id
 LEFT JOIN users issuer ON issuer.id = i.issued_by`;

export async function selectInvoiceById(client, id) {
  const { rows } = await client.query(`${invoiceSelect} WHERE i.id = $1 LIMIT 1`, [id]);
  return normalizeInvoice(rows[0]);
}

async function selectInvoiceBySource(client, type, sourceId) {
  const sourceColumn = type === "staff_payout" ? "payout_request_id" : "booking_id";
  const { rows } = await client.query(`${invoiceSelect} WHERE i.${sourceColumn} = $1 LIMIT 1`, [sourceId]);
  return normalizeInvoice(rows[0]);
}

export async function issueCustomerInvoice(client, { bookingId, issuedById, resortId = null }) {
  const bookingScope = resortId ? " AND b.resort_id = $2" : "";
  const bookingParams = resortId ? [bookingId, resortId] : [bookingId];
  const { rows } = await client.query(
    `SELECT b.*, p.name AS package_name, p.location AS package_location,
      r.name AS resort_name, staff.name AS staff_name
     FROM bookings b
     JOIN packages p ON p.id = b.package_id
     LEFT JOIN resorts r ON r.id = b.resort_id
     JOIN users staff ON staff.id = b.staff_id
	 WHERE b.id = $1${bookingScope}
     FOR UPDATE`,
    bookingParams,
  );
  const booking = rows[0];
  if (!booking) return { error: "Booking not found.", status: 404 };

  const existing = await selectInvoiceBySource(client, "customer", bookingId);
  if (existing) return { invoice: existing, created: false };
  if (!CUSTOMER_ELIGIBLE_STATUSES.has(booking.status)) {
    return {
      error: "Cancelled or rejected bookings cannot be invoiced.",
      status: 409,
    };
  }
  if (booking.payment_status !== "paid" || !booking.payment_confirmed_at || !booking.payment_confirmed_by) {
    return {
      error: "Confirm the customer payment before issuing an invoice.",
      status: 409,
    };
  }
  if (roundMoney(booking.invoice_total_usd) <= 0) {
    return { error: "This booking has no chargeable amount.", status: 409 };
  }

  const experienceResult = await client.query(
    `SELECT be.id, be.event_date, be.time_start, be.time_end, be.observation_spot,
      be.base_total_usd, p.name AS package_name
     FROM booking_experiences be
     JOIN packages p ON p.id = be.package_id
     WHERE be.booking_id = $1
     ORDER BY be.sort_order`,
    [bookingId],
  );
  const id = randomUUID();
  const issuedAt = new Date();
  const invoiceNumber = invoiceNumberFor("customer", id, issuedAt);
  const today = issuedAt.toISOString().slice(0, 10);
  const eventDate = isoDate(booking.event_date);
  const dueDate = eventDate && eventDate > today ? eventDate : today;
  const lineItems = buildCustomerLineItems(booking, experienceResult.rows);
  const sourceSnapshot = {
    booking_code: booking.booking_code,
    booking_status: booking.status,
    booking_date: isoDate(booking.booking_date),
    event_date: eventDate,
    guest_name: booking.guest_name,
    guest_email: booking.guest_email,
    guest_phone: booking.guest_phone,
    room_number: booking.room_number,
    nationality: booking.nationality,
    adult_count: Number(booking.adult_count),
    child_count: Number(booking.child_count),
    resort_name: booking.resort_name,
    staff_name: booking.staff_name,
    payment_method: booking.payment_method,
    payment_status: booking.payment_status,
    payment_confirmed_at: isoTimestamp(booking.payment_confirmed_at),
    payment_confirmed_by: booking.payment_confirmed_by,
    payment_reference: booking.payment_reference,
    tax_label: booking.tax_label,
    tax_rate_percent: roundMoney(booking.tax_rate_percent),
  };

  await client.query(
    `INSERT INTO invoices (
      id, invoice_number, invoice_type, status, booking_id, payout_request_id,
      recipient_name, recipient_email, recipient_phone, recipient_detail,
      payment_method, currency, issued_at, due_date, subtotal_usd,
      service_charge_usd, tax_usd, tax_label, tax_rate_percent, total_usd, line_items, source_snapshot,
      notes, issued_by
    ) VALUES (
      $1, $2, 'customer', 'issued', $3, NULL,
      $4, $5, $6, $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16, $17, $18::jsonb, $19::jsonb, $20, $21
    )`,
    [
      id,
      invoiceNumber,
      booking.id,
      booking.guest_name,
      booking.guest_email,
      booking.guest_phone,
      [booking.resort_name, booking.room_number ? `Room ${booking.room_number}` : null].filter(Boolean).join(" · ") ||
        null,
      booking.payment_method || null,
      booking.currency || "USD",
      issuedAt,
      dueDate,
      roundMoney(booking.base_total_usd),
      roundMoney(booking.service_charge_10_usd),
      roundMoney(booking.gst_17_usd),
      booking.tax_label || "Tourism GST (TGST)",
      roundMoney(booking.tax_rate_percent ?? 17),
      roundMoney(booking.invoice_total_usd),
      JSON.stringify(lineItems),
      JSON.stringify(sourceSnapshot),
      booking.billing_notes || null,
      issuedById,
    ],
  );
  await client.query("UPDATE bookings SET invoice_number = $2 WHERE id = $1", [booking.id, invoiceNumber]);
  return { invoice: await selectInvoiceById(client, id), created: true };
}

export async function issuePayoutInvoice(client, { payoutRequestId, issuedById }) {
  const { rows } = await client.query(
    `SELECT pr.*, u.name AS requester_name, u.email AS requester_email,
      u.phone AS requester_phone, u.role AS requester_role, r.name AS resort_name
     FROM payout_requests pr
     JOIN users u ON u.id = pr.requester_id
     LEFT JOIN resorts r ON r.id = pr.resort_id
     WHERE pr.id = $1
     FOR UPDATE`,
    [payoutRequestId],
  );
  const payout = rows[0];
  if (!payout) return { error: "Payout request not found.", status: 404 };

  const existing = await selectInvoiceBySource(client, "staff_payout", payoutRequestId);
  if (existing) return { invoice: existing, created: false };
  if (payout.status !== "completed" || !payout.paid_at) {
    return {
      error: "A payout invoice can only be issued after payment is completed.",
      status: 409,
    };
  }

  const id = randomUUID();
  const issuedAt = new Date();
  const invoiceNumber = invoiceNumberFor("staff_payout", id, issuedAt);
  const accountNumber = String(payout.account_number ?? "");
  const maskedAccount = accountNumber
    ? `${"•".repeat(Math.max(0, Math.min(accountNumber.length - 4, 8)))}${accountNumber.slice(-4)}`
    : null;
  const lineItems = buildPayoutLineItems(payout);
  const sourceSnapshot = {
    payout_status: payout.status,
    requester_role: payout.requester_role,
    resort_name: payout.resort_name,
    commission_usd: roundMoney(payout.commission_usd),
    star_bonus_usd: roundMoney(payout.star_bonus_usd),
    star_points: roundMoney(payout.star_points),
    full_stars: Number(payout.full_stars ?? 0),
    bank_name: payout.bank_name,
    account_holder_name: payout.account_holder_name,
    masked_account_number: maskedAccount,
    requested_at: isoTimestamp(payout.created_at),
    paid_at: isoTimestamp(payout.paid_at),
  };

  await client.query(
    `INSERT INTO invoices (
      id, invoice_number, invoice_type, status, booking_id, payout_request_id,
      recipient_name, recipient_email, recipient_phone, recipient_detail,
      payment_method, currency, issued_at, due_date, subtotal_usd,
      service_charge_usd, tax_usd, tax_label, tax_rate_percent, total_usd, line_items, source_snapshot,
      notes, issued_by
    ) VALUES (
      $1, $2, 'staff_payout', 'paid', NULL, $3,
      $4, $5, $6, $7, $8, 'USD', $9, NULL, $10,
      0, 0, 'No tax', 0, $11, $12::jsonb, $13::jsonb, $14, $15
    )`,
    [
      id,
      invoiceNumber,
      payout.id,
      payout.requester_name,
      payout.requester_email,
      payout.requester_phone,
      payout.resort_name || "Internal operations",
      `Bank transfer · ${payout.bank_name} · ${maskedAccount || "account on file"}`,
      issuedAt,
      roundMoney(payout.amount_usd),
      roundMoney(payout.amount_usd),
      JSON.stringify(lineItems),
      JSON.stringify(sourceSnapshot),
      payout.admin_notes || payout.notes || null,
      issuedById,
    ],
  );
  return { invoice: await selectInvoiceById(client, id), created: true };
}

export async function listInvoices(client) {
  const { rows } = await client.query(`${invoiceSelect} ORDER BY i.issued_at DESC, i.created_at DESC LIMIT 500`);
  return rows.map(normalizeInvoice);
}

/**
 * @param {*} client
 * @param {{ resortId?: string | null }} [options]
 */
export async function listCustomerInvoices(client, { resortId = null } = {}) {
  const resortScope = resortId ? " AND b.resort_id = $1" : "";
  const params = resortId ? [resortId] : [];
  const { rows } = await client.query(
    `${invoiceSelect}
	 WHERE i.invoice_type = 'customer'${resortScope}
	 ORDER BY i.issued_at DESC, i.created_at DESC
	 LIMIT 500`,
    params,
  );
  return rows.map(normalizeInvoice);
}

export async function listInvoiceSources(client) {
  const [bookings, payouts] = await Promise.all([
    client.query(
      `SELECT b.id, b.booking_code AS reference, b.guest_name AS recipient_name,
        b.guest_email AS recipient_email, b.event_date AS source_date,
        b.invoice_total_usd AS amount_usd, b.status, r.name AS context_name
       FROM bookings b
       LEFT JOIN resorts r ON r.id = b.resort_id
       LEFT JOIN invoices i ON i.booking_id = b.id
       WHERE i.id IS NULL
         AND b.status IN ('active', 'rescheduled', 'completed')
         AND b.payment_status = 'paid'
         AND b.payment_confirmed_at IS NOT NULL
         AND b.payment_confirmed_by IS NOT NULL
         AND b.invoice_total_usd > 0
       ORDER BY b.created_at DESC
       LIMIT 300`,
    ),
    client.query(
      `SELECT pr.id, pr.id AS reference, u.name AS recipient_name,
        u.email AS recipient_email, pr.paid_at AS source_date,
        pr.amount_usd, pr.status, COALESCE(r.name, 'Internal operations') AS context_name
       FROM payout_requests pr
       JOIN users u ON u.id = pr.requester_id
       LEFT JOIN resorts r ON r.id = pr.resort_id
       LEFT JOIN invoices i ON i.payout_request_id = pr.id
       WHERE i.id IS NULL AND pr.status = 'completed' AND pr.paid_at IS NOT NULL
       ORDER BY pr.paid_at DESC
       LIMIT 300`,
    ),
  ]);
  const normalizeSource = (type) => (row) => ({
    ...row,
    type,
    amount_usd: roundMoney(row.amount_usd),
    source_date: isoTimestamp(row.source_date) ?? isoDate(row.source_date),
  });
  return {
    customer: bookings.rows.map(normalizeSource("customer")),
    staff_payout: payouts.rows.map(normalizeSource("staff_payout")),
  };
}

function normalizeWorkflow(row) {
  return {
    ...row,
    amount_usd: roundMoney(row.amount_usd),
    base_total_usd: roundMoney(row.base_total_usd),
    service_charge_usd: roundMoney(row.service_charge_10_usd),
    tax_usd: roundMoney(row.gst_17_usd),
    tax_label: String(row.tax_label ?? "Tourism GST (TGST)"),
    tax_rate_percent: roundMoney(row.tax_rate_percent ?? 17),
    commission_usd: roundMoney(row.commission_usd),
    star_bonus_usd: roundMoney(row.star_bonus_usd),
    source_date: isoTimestamp(row.source_date) ?? isoDate(row.source_date),
    confirmed_at: isoTimestamp(row.confirmed_at),
  };
}

/**
 * @param {*} client
 * @param {{ resortId?: string | null }} [options]
 */
export async function listCustomerPaymentWorkflows(client, { resortId = null } = {}) {
  const resortScope = resortId ? " AND b.resort_id = $1" : "";
  const params = resortId ? [resortId] : [];
  const { rows } = await client.query(
    `SELECT b.id, 'customer' AS type, b.booking_code AS reference,
        b.guest_name AS recipient_name, b.guest_email AS recipient_email,
        b.event_date AS source_date, b.invoice_total_usd AS amount_usd,
        b.status AS source_status, b.payment_status AS workflow_status,
        b.base_total_usd, b.service_charge_10_usd, b.gst_17_usd,
        b.tax_label, b.tax_rate_percent,
        b.payment_method, b.payment_confirmed_at AS confirmed_at,
        b.payment_reference, b.payment_notes,
        r.name AS context_name, i.id AS invoice_id,
        i.invoice_number, i.status AS invoice_status
       FROM bookings b
       LEFT JOIN resorts r ON r.id = b.resort_id
       LEFT JOIN invoices i ON i.booking_id = b.id
       WHERE b.status IN ('active', 'rescheduled', 'completed')
         AND b.invoice_total_usd > 0
		 ${resortScope}
       ORDER BY CASE b.payment_status WHEN 'pending' THEN 0 ELSE 1 END,
         b.event_date DESC, b.created_at DESC
		 LIMIT 500`,
    params,
  );
  return rows.map(normalizeWorkflow);
}

export async function listInvoiceWorkflows(client) {
  const [payments, payouts] = await Promise.all([
    listCustomerPaymentWorkflows(client),
    client.query(
      `SELECT pr.id, 'staff_payout' AS type, pr.id AS reference,
        u.name AS recipient_name, u.email AS recipient_email,
        pr.created_at AS source_date, pr.amount_usd,
        u.role AS source_status, pr.status AS workflow_status,
        pr.commission_usd, pr.star_bonus_usd, pr.star_points, pr.full_stars,
        CONCAT('Bank transfer · ', pr.bank_name) AS payment_method,
        pr.paid_at AS confirmed_at, NULL AS payment_reference,
        pr.admin_notes AS payment_notes,
        COALESCE(r.name, 'Internal operations') AS context_name,
        i.id AS invoice_id, i.invoice_number, i.status AS invoice_status,
        pr.bank_name, pr.account_holder_name,
        CASE
          WHEN LENGTH(pr.account_number) <= 4 THEN pr.account_number
          ELSE CONCAT('••••', RIGHT(pr.account_number, 4))
        END AS masked_account_number
       FROM payout_requests pr
       JOIN users u ON u.id = pr.requester_id
       LEFT JOIN resorts r ON r.id = pr.resort_id
       JOIN invoices i ON i.payout_request_id = pr.id
         AND i.invoice_type = 'staff_payout'
       WHERE pr.status = 'completed' AND pr.paid_at IS NOT NULL
       ORDER BY pr.paid_at DESC, pr.created_at DESC
       LIMIT 500`,
    ),
  ]);

  return {
    payment: payments,
    business: payouts.rows.map(normalizeWorkflow),
  };
}
