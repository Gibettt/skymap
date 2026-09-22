import { downloadExcelReport } from "@ephemeris/export";

import type { StaffBooking, StaffRole } from "../../_lib/staff-api";

function bookingTime(start: string | null, end: string | null) {
  const shortTime = (value: string | null) => (value ? value.slice(0, 5) : "-");
  return `${shortTime(start)} - ${shortTime(end)}`;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export async function exportBookingsToExcel(bookings: StaffBooking[], role: StaffRole) {
  const roleLabel = role === "external" ? "External Staff" : "Internal Staff";

  await downloadExcelReport({
    title: `SpaceCat ASTROTOURISM — ${roleLabel} Bookings`,
    subtitle: "Filtered booking records",
    filename: `ephemeris-${role}-bookings-${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName: "Bookings",
    columns: [
      { key: "bookingCode", header: "Booking code", width: 24 },
      { key: "guest", header: "Guest", width: 24 },
      { key: "eventDate", header: "Event date", width: 16, kind: "date" },
      { key: "time", header: "Time", width: 18 },
      { key: "package", header: "Package", width: 27 },
      { key: "staff", header: "Staff", width: 23 },
      { key: "staffType", header: "Staff type", width: 14 },
      { key: "resort", header: "Resort", width: 28 },
      { key: "guests", header: "Guests", width: 11, kind: "number" },
      { key: "status", header: "Status", width: 18, kind: "status" },
      { key: "invoice", header: "Invoice (USD)", width: 18, kind: "currency" },
      { key: "commission", header: "Commission (USD)", width: 20, kind: "currency" },
    ],
    rows: bookings.map((booking) => ({
      bookingCode: booking.booking_code,
      guest: booking.guest_name,
      eventDate: booking.event_date,
      time: bookingTime(booking.time_start, booking.time_end),
      package: booking.package_name,
      staff: booking.staff_name,
      staffType: titleCase(booking.staff_role),
      resort: booking.resort_name ?? "Unassigned",
      guests: Number(booking.adult_count) + Number(booking.child_count),
      status: titleCase(booking.status),
      invoice: Number(booking.invoice_total_usd ?? 0),
      commission: Number(booking.staff_commission_5_usd ?? 0),
    })),
  });
}
