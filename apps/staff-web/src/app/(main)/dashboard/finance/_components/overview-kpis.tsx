import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface OverviewKpisData {
  totalRevenue: {
    label: string;
    value: string;
    detail: string;
    change: string;
  };
  companyShare: {
    label: string;
    value: string;
    detail: string;
    change: string;
  };
  openPayouts: {
    label: string;
    value: string;
    detail: string;
    change: string;
  };
  completionRate: {
    label: string;
    value: string;
    detail: string;
    change: string;
  };
}

const defaultData: OverviewKpisData = {
  totalRevenue: {
    label: "Net worth",
    value: "$128.4K",
    detail: "+$9.8K vs last month",
    change: "+8.4%",
  },
  companyShare: {
    label: "Available cash",
    value: "$12.8K",
    detail: "$410 above your 30-day average",
    change: "+3.2%",
  },
  openPayouts: {
    label: "Monthly spend",
    value: "$2,140",
    detail: "$124 more than last month",
    change: "+6.1%",
  },
  completionRate: {
    label: "Savings rate",
    value: "28%",
    detail: "Up from 25.6% last month",
    change: "+2.4%",
  },
};

export function OverviewKpis({ data = defaultData }: { data?: OverviewKpisData }) {
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid grid-cols-1 xl:grid-cols-8">
        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 xl:col-span-4 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">{data.totalRevenue.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="text-3xl leading-none tracking-tight">{data.totalRevenue.value}</div>
              <p className="text-muted-foreground text-xs">{data.totalRevenue.detail}</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {data.totalRevenue.change}
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">{data.companyShare.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-3xl leading-none tracking-tight">{data.companyShare.value}</div>
              <p className="text-muted-foreground text-xs">{data.companyShare.detail}</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {data.companyShare.change}
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 ring-0 xl:col-span-4 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">{data.openPayouts.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-3xl leading-none tracking-tight">{data.openPayouts.value}</div>
              <p className="text-muted-foreground text-xs">{data.openPayouts.detail}</p>
            </div>
            <Badge variant="destructive" className="bg-destructive/10 text-destructive">
              {data.openPayouts.change}
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 ring-0 xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">{data.completionRate.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-3xl leading-none tracking-tight">{data.completionRate.value}</div>
              <p className="text-muted-foreground text-xs">{data.completionRate.detail}</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {data.completionRate.change}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
