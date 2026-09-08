import { MetricCards } from "../default/_components/metric-cards";
import { PerformanceOverview } from "../default/_components/performance-overview";
import { SubscriberOverview } from "../default/_components/subscriber-overview";
import { getDefaultOverviewData } from "../default/_lib/overview-data";

export default async function AdminOverviewPage() {
  const overview = await getDefaultOverviewData();

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MetricCards metrics={overview.metrics} />
      <PerformanceOverview data={overview.activity} />
      <SubscriberOverview data={overview.recentBookings} total={overview.metrics.totalBookings} />
    </div>
  );
}
