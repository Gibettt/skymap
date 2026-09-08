import type { RecentCustomerRow } from "../_components/recent-customers-table/schema";

export interface OverviewMetrics {
  totalRevenue: number;
  revenueChange: number;
  newBookings: number;
  bookingChange: number;
  activeAccounts: number;
  activeAccountRate: number;
  completionRate: number;
  totalBookings: number;
  completedBookings: number;
}

export interface BookingActivityPoint {
  date: string;
  totalBookings: number;
  openBookings: number;
  completedBookings: number;
}

export function getDefaultOverviewData(): Promise<{
  metrics: OverviewMetrics;
  activity: BookingActivityPoint[];
  recentBookings: RecentCustomerRow[];
}>;
