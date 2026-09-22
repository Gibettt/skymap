import { jsonError, requirePermission } from "@ephemeris/auth";
import { query } from "@ephemeris/db";
import { createExcelReportBuffer } from "@ephemeris/export";

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
    const filename = `ephemeris-finance-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const workbook = await createExcelReportBuffer({
      title: "SpaceCat ASTROTOURISM — Finance",
      subtitle: "Completed booking revenue allocation",
      filename,
      sheetName: "Finance",
      columns: [
        { key: "bookingCode", header: "Booking code", width: 24 },
        { key: "eventDate", header: "Event date", width: 16, kind: "date" },
        { key: "guest", header: "Guest", width: 24 },
        { key: "resort", header: "Resort", width: 28 },
        { key: "paymentMethod", header: "Payment method", width: 18 },
        { key: "invoice", header: "Invoice total (USD)", width: 20, kind: "currency" },
        { key: "resortShare", header: "Resort share (USD)", width: 20, kind: "currency" },
        { key: "companyShare", header: "Company share (USD)", width: 20, kind: "currency" },
        { key: "commission", header: "Staff commission (USD)", width: 22, kind: "currency" },
      ],
      rows: rows.map((row) => ({
        bookingCode: row.booking_code,
        eventDate: row.event_date,
        guest: row.guest_name,
        resort: row.resort_name,
        paymentMethod: row.payment_method,
        invoice: row.invoice_total_usd,
        resortShare: row.operation_share_50_usd,
        companyShare: row.company_share_50_usd,
        commission: row.staff_commission_5_usd,
      })),
    });

    return new Response(workbook, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
