export interface BookingRow {
  id: string;
  booking_code: string;
  booking_date: string;
  event_date: string;
  time_start: string | null;
  time_end: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  preferred_language: string | null;
  room_number: string;
  nationality: string;
  package_id: string;
  package_name: string;
  staff_id: string;
  staff_name: string;
  staff_role?: string | null;
  resort_id: string | null;
  resort_name: string | null;
  status: string;
  booked_adult_price_usd: string | number;
  booked_child_price_usd: string | number;
  invoice_total_usd: string | number;
  adult_count: string | number;
  child_count: string | number;
  signed_by_guest: boolean;
  booking_source: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingPackageOption {
  id: string;
  name: string;
  resort_id: string | null;
  is_active: boolean;
}

export interface BookingStaffOption {
  id: string;
  name: string;
  role: string;
  resort_id: string | null;
  status: string;
}

export interface BookingResortOption {
  id: string;
  name: string;
  status: string;
}

export interface BookingOptions {
  packages: BookingPackageOption[];
  staff: BookingStaffOption[];
  resorts: BookingResortOption[];
}

export interface CalendarResortOption {
  id: string;
  name: string;
  timezone: string;
  status: string;
}

export interface CalendarPackageOption {
  id: string;
  name: string;
  resort_id: string | null;
  is_active: boolean;
}

export interface CalendarOptions {
  resorts: CalendarResortOption[];
  packages: CalendarPackageOption[];
}

export interface ResortRow {
  id: string;
  name: string;
  code: string;
  slug: string | null;
  location: string;
  timezone: string;
  latitude: string | number | null;
  longitude: string | number | null;
  observation_spots: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  whatsapp_number: string | null;
  status: string;
  coverage_status: string;
  active_internal_count: number;
  active_external_count: number;
  total_bookings_count: number;
  open_bookings_count: number;
  created_at: string;
  updated_at: string;
}

export interface PackageRow {
  id: string;
  name: string;
  package_type: string;
  experience_type: string;
  location: string;
  description: string | null;
  resort_id: string | null;
  resort_name: string | null;
  schedule: string;
  inclusions: string[];
  adult_price_usd: string | number;
  child_price_usd: string | number | null;
  child_age_range: string | null;
  is_chargeable: boolean;
  is_active: boolean;
  has_image: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  resort_id: string | null;
  resort_name: string | null;
  status: string;
  presence: string | null;
  total_booking: number;
  created_at: string;
  updated_at: string;
  last_seen_at: string | null;
  last_active_at: string | null;
}

export interface UserResortOption {
  id: string;
  name: string;
  location: string | null;
  status: string;
}

export interface FinanceResortRow {
  id: string;
  name: string;
  code: string;
  completed_bookings: number;
  invoice_total: string | number;
  resort_share: string | number;
}

export interface PayoutRow {
  id: string;
  requester_name: string;
  requester_email: string;
  requester_role: string;
  resort_name: string | null;
  bank_name: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  status: string;
  amount_usd: string | number;
}

export interface FinanceDailyRow {
  day: string;
  revenue: string | number;
  payouts: string | number;
}

export interface AuditLogRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: unknown;
  after_data: unknown;
  ip_address: string | null;
  user_agent: string | null;
}

export interface NotificationRow {
  id: string;
  type: "booking" | "payout";
  source_table: "bookings" | "payout_requests";
  source_id: string;
  title: string;
  message: string;
  meta: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RewardSettingsRow {
  star_adult_unit: string | number;
  star_child_unit: string | number;
  star_threshold: string | number;
  star_bonus_usd: string | number;
}

export function getOverview(): Promise<{
  bookings: { total: number; open: number; completed: number; revenue: string | number };
  resorts: { total: number; active: number };
  users: { total: number; active: number; staff: number };
  recentBookings: BookingRow[];
}>;
export function getBookings(): Promise<BookingRow[]>;
export function getBookingOptions(): Promise<BookingOptions>;
export function getCalendarOptions(): Promise<CalendarOptions>;
export function getResorts(): Promise<ResortRow[]>;
export function getPackages(): Promise<PackageRow[]>;
export function getPackageResortOptions(): Promise<Array<{ id: string; name: string }>>;
export function getUsers(): Promise<{ users: UserRow[]; resorts: UserResortOption[] }>;
export function getFinance(): Promise<{
  summary: {
    total_bookings: number;
    completed_bookings: number;
    base_total: string | number;
    service_charge: string | number;
    gst: string | number;
    invoice_total: string | number;
    resort_share: string | number;
    company_share: string | number;
    staff_commission: string | number;
    open_payouts: number;
    open_payout_total: string | number;
    completed_payout_total: string | number;
    last_updated_at: string | null;
  };
  monthly: {
    current_total_bookings: number;
    current_completed_bookings: number;
    current_revenue: string | number;
    current_company_share: string | number;
    current_staff_commission: string | number;
    previous_total_bookings: number;
    previous_completed_bookings: number;
    previous_revenue: string | number;
    previous_company_share: string | number;
    previous_staff_commission: string | number;
  };
  daily: FinanceDailyRow[];
  resorts: FinanceResortRow[];
  payouts: PayoutRow[];
}>;
export function getAuditLogs(): Promise<AuditLogRow[]>;
export function getRewardSettings(): Promise<RewardSettingsRow | null>;
export function getNotifications(userId: string): Promise<NotificationRow[]>;
