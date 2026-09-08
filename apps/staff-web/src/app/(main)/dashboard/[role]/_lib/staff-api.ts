export type StaffRole = "internal" | "external";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  resort_id: string | null;
  resort_name: string | null;
  access_role_level: "full" | "scoped" | "read_only" | null;
}

export interface StaffBookingParticipant {
  id?: string;
  fullName: string;
  type: "adult" | "child";
  age: number | null;
  nationality: string;
  notes: string | null;
  sortOrder?: number;
}

export interface StaffBookingExperience {
  id?: string;
  packageId: string;
  packageName: string;
  location: string | null;
  skyEventId: string | null;
  eventDate: string;
  timeStart: string;
  timeEnd: string;
  observationSpot: string | null;
  adultPriceUsd: number;
  childPriceUsd: number;
  baseTotalUsd: number;
  sortOrder?: number;
}

export interface StaffBooking {
  id: string;
  booking_code: string;
  booking_date: string;
  event_date: string;
  time_start: string | null;
  time_end: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  preferred_language?: string | null;
  room_number: string;
  nationality: string;
  adult_count: number;
  child_count: number;
  participants?: StaffBookingParticipant[];
  experiences?: StaffBookingExperience[];
  package_id?: string;
  package_name: string;
  staff_id?: string;
  staff_name: string;
  staff_role: StaffRole;
  resort_id?: string | null;
  resort_name: string | null;
  status: "pending" | "active" | "completed" | "rejected" | "cancelled_by_guest" | "cancelled_weather" | "rescheduled";
  signed_by_guest: boolean;
  booked_adult_price_usd?: number;
  booked_child_price_usd?: number;
  invoice_total_usd?: number;
  staff_commission_5_usd?: number;
  booking_source?: string | null;
  payment_method?: string | null;
  observation_spot: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface StaffBookingsResponse {
  bookings: StaffBooking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StaffPackage {
  id: string;
  name: string;
  package_type: "regular" | "private" | "kids";
  experience_type: "communal" | "private" | "kids";
  location: string;
  description: string | null;
  schedule: string | null;
  adult_price_usd: number;
  child_price_usd: number | null;
  child_age_range: string | null;
  is_chargeable: boolean;
  is_active: boolean;
  has_image: boolean;
  image_url: string | null;
  inclusions: string[] | string | null;
  updated_at: string;
}

interface ApiErrorPayload {
  error?: string;
}

export async function staffApi<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return payload;
}

export async function loadAllStaffBookings(limit = 100) {
  const firstPage = await staffApi<StaffBookingsResponse>(`/api/bookings?page=1&limit=${limit}`, {
    cache: "no-store",
  });
  const responses = [firstPage];

  // Keep pagination requests sequential so a large account does not create a
  // burst of simultaneous database queries from one browser tab.
  for (let page = 2; page <= firstPage.pagination.totalPages; page += 1) {
    responses.push(
      await staffApi<StaffBookingsResponse>(`/api/bookings?page=${page}&limit=${limit}`, {
        cache: "no-store",
      }),
    );
  }

  return responses.flatMap((response) => response.bookings ?? []);
}

export function isStaffRole(value: string): value is StaffRole {
  return value === "internal" || value === "external";
}

export function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatUsd(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const normalized = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function shortTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "-";
}

export function packageInclusions(value: StaffPackage["inclusions"]): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}
