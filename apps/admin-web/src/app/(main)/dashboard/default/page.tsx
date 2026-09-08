import { redirect } from "next/navigation";

import { currentUser } from "@ephemeris/auth";

import { MetricCards } from "./_components/metric-cards";
import { PerformanceOverview } from "./_components/performance-overview";
import { SubscriberOverview } from "./_components/subscriber-overview";
import { getDefaultOverviewData } from "./_lib/overview-data";

export default async function Page() {
  const user = await currentUser();
  if (user?.role !== "admin") redirect("/login");
  const overview = await getDefaultOverviewData();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards metrics={overview.metrics} />
      <PerformanceOverview data={overview.activity} />
      <SubscriberOverview data={overview.recentBookings} total={overview.metrics.totalBookings} />
    </div>
  );
}
