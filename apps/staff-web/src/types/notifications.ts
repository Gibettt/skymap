export interface AdminNotification {
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
  updated_at?: string;
}
