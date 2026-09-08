import { getResorts } from "../_lib/admin-data";

import { Resorts } from "./_components/resorts";

export default async function ResortsPage() {
  const rows = await getResorts();
  const resorts = rows.map((resort) => ({
    id: String(resort.id),
    name: String(resort.name),
    code: String(resort.code),
    slug: resort.slug ? String(resort.slug) : null,
    location: String(resort.location ?? ""),
    timezone: String(resort.timezone),
    latitude: resort.latitude == null ? null : Number(resort.latitude),
    longitude: resort.longitude == null ? null : Number(resort.longitude),
    observation_spots: String(resort.observation_spots ?? ""),
    contact_name: resort.contact_name ? String(resort.contact_name) : null,
    contact_phone: resort.contact_phone ? String(resort.contact_phone) : null,
    contact_email: resort.contact_email ? String(resort.contact_email) : null,
    whatsapp_number: resort.whatsapp_number ? String(resort.whatsapp_number) : null,
    status: String(resort.status),
    coverage_status: String(resort.coverage_status),
    active_internal_count: Number(resort.active_internal_count),
    active_external_count: Number(resort.active_external_count),
    total_bookings_count: Number(resort.total_bookings_count),
    open_bookings_count: Number(resort.open_bookings_count),
    created_at: String(resort.created_at),
    updated_at: String(resort.updated_at),
  }));

  return <Resorts resorts={resorts} />;
}
