export type BookingPortalRole = "admin" | "internal" | "external";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: BookingPortalRole;
  resort_id: string | null;
  resort_name: string | null;
  access_role_level: "full" | "scoped" | "read_only" | null;
}

export interface AdminBooking {
  id: string;
  booking_code: string;
}

export interface AdminBookingPackage {
  id: string;
  name: string;
  package_type: "regular" | "private" | "kids";
  experience_type: "communal" | "private" | "kids";
  location: string;
  description: string | null;
  schedule: string | null;
  resort_id: string | null;
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

export async function adminBookingApi<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as T & ApiErrorPayload;

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return payload;
}

export function formatUsd(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

export function packageInclusions(value: AdminBookingPackage["inclusions"]): string[] {
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
