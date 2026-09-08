import { getBookingOptions, getBookings } from "../_lib/admin-data";
import { Bookings } from "./_components/bookings";

export default async function BookingsPage() {
  const [rows, rawOptions] = await Promise.all([getBookings(), getBookingOptions()]);
  const bookings = rows.map((booking) => ({
    id: String(booking.id),
    booking_code: String(booking.booking_code),
    booking_date: String(booking.booking_date),
    event_date: String(booking.event_date),
    time_start: booking.time_start ? String(booking.time_start) : null,
    time_end: booking.time_end ? String(booking.time_end) : null,
    guest_name: String(booking.guest_name),
    guest_phone: booking.guest_phone ? String(booking.guest_phone) : null,
    guest_email: booking.guest_email ? String(booking.guest_email) : null,
    preferred_language: booking.preferred_language ? String(booking.preferred_language) : null,
    room_number: String(booking.room_number),
    nationality: String(booking.nationality),
    package_id: String(booking.package_id),
    package_name: String(booking.package_name),
    staff_id: String(booking.staff_id),
    staff_name: String(booking.staff_name),
    resort_id: booking.resort_id ? String(booking.resort_id) : null,
    resort_name: booking.resort_name ? String(booking.resort_name) : null,
    status: String(booking.status),
    booked_adult_price_usd: Number(booking.booked_adult_price_usd),
    booked_child_price_usd: Number(booking.booked_child_price_usd),
    invoice_total_usd: Number(booking.invoice_total_usd),
    adult_count: Number(booking.adult_count),
    child_count: Number(booking.child_count),
    signed_by_guest: Boolean(booking.signed_by_guest),
    booking_source: booking.booking_source ? String(booking.booking_source) : null,
    payment_method: booking.payment_method ? String(booking.payment_method) : null,
    notes: booking.notes ? String(booking.notes) : null,
    created_at: String(booking.created_at),
    updated_at: String(booking.updated_at),
    experiences: (Array.isArray(booking.experiences) ? booking.experiences : [])
      .map((experience) => ({
        id: String(experience.id),
        packageId: String(experience.packageId),
        packageName: String(experience.packageName),
        location: experience.location ? String(experience.location) : null,
        skyEventId: experience.skyEventId ? String(experience.skyEventId) : null,
        eventDate: String(experience.eventDate),
        timeStart: experience.timeStart ? String(experience.timeStart) : null,
        timeEnd: experience.timeEnd ? String(experience.timeEnd) : null,
        observationSpot: experience.observationSpot ? String(experience.observationSpot) : null,
        adultPriceUsd: Number(experience.adultPriceUsd),
        childPriceUsd: Number(experience.childPriceUsd),
        baseTotalUsd: Number(experience.baseTotalUsd),
        sortOrder: Number(experience.sortOrder),
      }))
      .sort((left, right) => Number(left.sortOrder) - Number(right.sortOrder)),
  }));
  const options = {
    packages: rawOptions.packages.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      resort_id: item.resort_id ? String(item.resort_id) : null,
      is_active: Boolean(item.is_active),
    })),
    staff: rawOptions.staff.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      role: String(item.role),
      resort_id: item.resort_id ? String(item.resort_id) : null,
      status: String(item.status),
    })),
    resorts: rawOptions.resorts.map((item) => ({
      id: String(item.id),
      name: String(item.name),
      status: String(item.status),
    })),
  };

  return <Bookings bookings={bookings} options={options} />;
}
