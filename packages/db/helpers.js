import crypto from 'crypto';

export function cleanText(value, max = 500) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
}

export function cleanList(value, max = 12) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, max);
}

export function generateBookingCode() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `LM-${datePart}-${randomPart}`;
}

export function generateFeedbackToken() {
  return `fb-${crypto.randomBytes(18).toString('hex')}`;
}

export const bookingSelectQuery = `
  SELECT
    b.*,
    p.name AS package_name,
    p.package_type,
    p.experience_type,
    p.location,
    u.name AS staff_name,
    u.role AS staff_role,
    r.name AS resort_name,
    r.code AS resort_code,
    r.location AS resort_location,
    ft.token AS feedback_token,
    ft.status AS feedback_status,
    fs.rating,
    fs.comment
  FROM bookings b
  JOIN packages p ON p.id = b.package_id
  JOIN users u ON u.id = b.staff_id
  LEFT JOIN resorts r ON r.id = b.resort_id
  LEFT JOIN feedback_tokens ft ON ft.booking_id = b.id
  LEFT JOIN feedback_submissions fs ON fs.booking_id = b.id
`;

export function paginationFromRequest(request, defaultLimit = 50, maxLimit = 100) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const rawLimit = Number(url.searchParams.get('limit') || defaultLimit);
  const limit = Math.min(Math.max(1, Number.isFinite(rawLimit) ? rawLimit : defaultLimit), maxLimit);
  return { page, limit, offset: (page - 1) * limit };
}

export function paginationMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
