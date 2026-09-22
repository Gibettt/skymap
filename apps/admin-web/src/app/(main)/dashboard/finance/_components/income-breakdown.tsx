import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export interface IncomeSource {
  label: string;
  percentage: number;
  amount: string;
}

const defaultSources: IncomeSource[] = [
  { label: "Primary salary", percentage: 68, amount: "$4,560.00" },
  { label: "Freelance projects", percentage: 21, amount: "$1,412.00" },
  { label: "Dividends and interest", percentage: 11, amount: "$765.00" },
];

const barClasses = ["bg-chart-3", "bg-chart-3/75", "bg-chart-3/50"];

export function IncomeBreakdown({ sources = defaultSources }: { sources?: IncomeSource[] }) {
  return (
    <Card className="[--card-spacing:--spacing(3)] sm:[--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle className="font-normal">Income sources</CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-3 gap-1">
        {sources.slice(0, 3).map((source, index) => (
          <section className="isolate flex gap-[0.5px]" key={source.label}>
            <Separator
              orientation="vertical"
              className="mb-1 h-auto self-auto border-muted-foreground/50 border-l border-dashed bg-transparent"
            />
            <div className="flex min-h-20 min-w-0 flex-1 flex-col justify-between sm:min-h-24">
              <div className="flex min-w-0 flex-col gap-1 px-1">
                <p className="wrap-break-word text-muted-foreground text-xs leading-none">
                  {source.label} · {source.percentage}%
                </p>
                <div className="text-base leading-none tracking-tight sm:text-lg">{source.amount}</div>
              </div>
              <div className={`-ml-0.5 h-5 rounded-sm ${barClasses[index]}`} />
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
