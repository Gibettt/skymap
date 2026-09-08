import { jsonError, requirePermission } from "@ephemeris/auth";
import { query } from "@ephemeris/db";

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET() {
  try {
    await requirePermission("admin.finance", ["admin"]);
    const { rows } = await query(`SELECT b.booking_code, to_char(b.event_date, 'YYYY-MM-DD') AS event_date, b.guest_name,
      COALESCE(r.name, 'Internal') AS resort_name, b.payment_method, b.invoice_total_usd,
      b.operation_share_50_usd, b.company_share_50_usd, b.staff_commission_5_usd
      FROM bookings b
      LEFT JOIN resorts r ON r.id = b.resort_id
      WHERE b.status = 'completed'
      ORDER BY b.event_date DESC, b.created_at DESC`);
    const columns = [
      "Booking Code",
      "Event Date",
      "Guest",
      "Resort",
      "Payment Method",
      "Invoice Total USD",
      "Resort Share USD",
      "Company Share USD",
      "Staff Commission USD",
    ];
    const lines = [
      columns.map(csvCell).join(","),
      ...rows.map((row) =>
        [
          row.booking_code,
          row.event_date,
          row.guest_name,
          row.resort_name,
          row.payment_method,
          row.invoice_total_usd,
          row.operation_share_50_usd,
          row.company_share_50_usd,
          row.staff_commission_5_usd,
        ]
          .map(csvCell)
          .join(","),
      ),
    ];
    const filename = `ephemeris-finance-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
