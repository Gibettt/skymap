import type { StaffRole } from "@/lib/staff-access";

import { MetricCards } from "../../default/_components/metric-cards";
import { PerformanceOverview } from "../../default/_components/performance-overview";
import { SubscriberOverview } from "../../default/_components/subscriber-overview";
import type { StaffOverviewData } from "../_lib/overview-data";

type Props = {
  role: StaffRole;
  permissions: string[];
  data: StaffOverviewData;
};

export function StaffOverview({ role, permissions, data }: Props) {
  const templateMetrics = {
    totalRevenue: data.metrics.earnedCommissionUsd,
    revenueChange: data.metrics.commissionChange,
    newBookings: data.metrics.newBookings,
    bookingChange: data.metrics.bookingChange,
    activeAccounts: data.metrics.openBookings,
    activeAccountRate: data.metrics.openBookingRate,
    completionRate: data.metrics.completionRate,
    totalBookings: data.metrics.totalBookings,
    completedBookings: data.metrics.completedBookings,
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards metrics={templateMetrics} variant="staff" canViewFinance={permissions.includes("staff.finance")} />
      <PerformanceOverview data={data.activity} reportHref={`/dashboard/${role}/bookings`} />
      <SubscriberOverview
        data={data.recentBookings}
        total={data.metrics.totalBookings}
        exportFilename={`ephemeris-${role}-bookings.csv`}
      />
    </div>
  );
}
