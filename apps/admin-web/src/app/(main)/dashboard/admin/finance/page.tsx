import Link from "next/link";

import { format, formatDistanceToNow } from "date-fns";
import { Download, RotateCw, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, getInitials } from "@/lib/utils";

import {
  BalanceDistributionCard,
  type BalanceDistributionItem,
} from "../../finance/_components/balance-distribution-card";
import { FinanceNotification } from "../../finance/_components/finance-notification";
import { IncomeBreakdown, type IncomeSource } from "../../finance/_components/income-breakdown";
import { OverviewKpis, type OverviewKpisData } from "../../finance/_components/overview-kpis";
import { QuickActions } from "../../finance/_components/quick-actions";
import { TransactionsOverviewCard } from "../../finance/_components/transactions-overview-card";
import { UpcomingTransactions } from "../../finance/_components/upcoming-transactions";
import { Wallet } from "../../finance/_components/wallet";
import { PayoutActions } from "../_components/payout-actions";
import { getFinance, type PayoutRow } from "../_lib/admin-data";
import { StaffPayouts } from "./_components/staff-payouts";

const numberValue = (value: string | number | null | undefined) => Number(value ?? 0);

const currency = (value: string | number | null | undefined) =>
  formatCurrency(numberValue(value), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const changeLabel = (current: number, previous: number) => {
  const change = percentageChange(current, previous);
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
};

const allocationPercentage = (amount: number, total: number) => {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 1000) / 10;
};

const statusLabel = (status: string) =>
  status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const statusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
  if (status === "completed") return "default";
  if (status === "rejected") return "destructive";
  if (status === "processed") return "secondary";
  return "outline";
};

function PayoutSummaryAction({ payout }: { payout: PayoutRow }) {
  const status =
    payout.status === "completed" && payout.invoice_id ? (
      <Badge variant={statusVariant(payout.status)} asChild>
        <Link href={`/dashboard/admin/invoices?payout=${encodeURIComponent(payout.id)}`}>
          {statusLabel(payout.status)}
        </Link>
      </Badge>
    ) : (
      <Badge variant={statusVariant(payout.status)}>{statusLabel(payout.status)}</Badge>
    );

  if (!["requested", "processed"].includes(payout.status)) return status;

  return (
    <div className="flex items-center gap-1">
      {status}
      <PayoutActions
        id={payout.id}
        status={payout.status}
        requesterName={payout.requester_name}
        amountUsd={payout.amount_usd}
        adminNotes={payout.admin_notes}
      />
    </div>
  );
}

export default async function FinancePage() {
  const finance = await getFinance();
  const { summary, monthly } = finance;
  const formattedDate = format(new Date(), "EEEE, do MMMM yyyy");
  const updatedLabel = summary.last_updated_at
    ? `Updated ${formatDistanceToNow(new Date(summary.last_updated_at), { addSuffix: true })}`
    : "Connected to database";

  const currentRevenue = numberValue(monthly.current_revenue);
  const previousRevenue = numberValue(monthly.previous_revenue);
  const currentCompanyShare = numberValue(monthly.current_company_share);
  const previousCompanyShare = numberValue(monthly.previous_company_share);
  const currentCompletionRate = monthly.current_total_bookings
    ? (monthly.current_completed_bookings / monthly.current_total_bookings) * 100
    : 0;
  const previousCompletionRate = monthly.previous_total_bookings
    ? (monthly.previous_completed_bookings / monthly.previous_total_bookings) * 100
    : 0;

  const kpis: OverviewKpisData = {
    totalRevenue: {
      label: "Total revenue",
      value: currency(currentRevenue),
      detail: `${monthly.current_completed_bookings} completed bookings this month`,
      change: changeLabel(currentRevenue, previousRevenue),
    },
    companyShare: {
      label: "Company share",
      value: currency(currentCompanyShare),
      detail: `${currency(previousCompanyShare)} in the previous month`,
      change: changeLabel(currentCompanyShare, previousCompanyShare),
    },
    openPayouts: {
      label: "Open payouts",
      value: currency(summary.open_payout_total),
      detail: `${summary.open_payouts} request${summary.open_payouts === 1 ? "" : "s"} awaiting completion`,
      change: `${summary.open_payouts} open`,
    },
    completionRate: {
      label: "Completion rate",
      value: `${currentCompletionRate.toFixed(1)}%`,
      detail: `${monthly.current_completed_bookings} of ${monthly.current_total_bookings} bookings this month`,
      change: changeLabel(currentCompletionRate, previousCompletionRate),
    },
  };

  const invoiceTotal = numberValue(summary.invoice_total);
  const resortShare = numberValue(summary.resort_share);
  const companyShare = numberValue(summary.company_share);
  const serviceCharge = numberValue(summary.service_charge);
  const gst = numberValue(summary.gst);
  const taxesAndFees = serviceCharge + gst;
  const resortPercentage = Math.round(allocationPercentage(resortShare, invoiceTotal));
  const companyPercentage = Math.round(allocationPercentage(companyShare, invoiceTotal));

  const incomeSources: IncomeSource[] = [
    { label: "Resort share", amount: currency(resortShare), percentage: resortPercentage },
    { label: "Company share", amount: currency(companyShare), percentage: companyPercentage },
    {
      label: "Service charge and GST",
      amount: currency(taxesAndFees),
      percentage: Math.max(0, 100 - resortPercentage - companyPercentage),
    },
  ];

  const balances: BalanceDistributionItem[] = [
    {
      account: "Company Share",
      amount: companyShare,
      key: "main",
      percentage: allocationPercentage(companyShare, invoiceTotal),
    },
    {
      account: "Resort Share",
      amount: resortShare,
      key: "savings",
      percentage: allocationPercentage(resortShare, invoiceTotal),
    },
    {
      account: "Service Charge",
      amount: serviceCharge,
      key: "investment",
      percentage: allocationPercentage(serviceCharge, invoiceTotal),
    },
    {
      account: "GST",
      amount: gst,
      key: "reserve",
      percentage: allocationPercentage(gst, invoiceTotal),
    },
  ];

  const chartData = finance.daily.map((row) => ({
    date: `${row.day}T00:00:00Z`,
    expense: numberValue(row.payouts),
    income: numberValue(row.revenue),
  }));

  const resortWallet = finance.resorts.slice(0, 3).map((resort) => ({
    id: resort.id,
    label: `${resort.name} · ${resort.code}`,
    description: `${currency(resort.invoice_total)} · ${resort.completed_bookings} completed`,
  }));
  const openPayouts = finance.payouts.filter((payout) => ["requested", "processed"].includes(payout.status));
  const payablePayouts = finance.payouts.filter((payout) => payout.status !== "rejected");
  const recentPayouts = [...finance.payouts]
    .sort((first, second) => new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime())
    .slice(0, 3);
  const payoutWallet = openPayouts.slice(0, 2).map((payout) => ({
    id: payout.id,
    label: `${payout.requester_name} · ${statusLabel(payout.status)}`,
    description: `${payout.bank_name} · ${currency(payout.amount_usd)}`,
  }));
  const payoutTransactions = recentPayouts.map((payout) => ({
    id: payout.id,
    title: `${payout.requester_name} · ${statusLabel(payout.status)}`,
    date: `${payout.resort_name ?? "Internal"} · ${format(new Date(payout.updated_at), "MMMM dd, yyyy")}`,
    action: <PayoutSummaryAction payout={payout} />,
  }));
  const totalPayoutAmount = payablePayouts.reduce((total, payout) => total + numberValue(payout.amount_usd), 0);
  const contacts = [...new Map(openPayouts.map((payout) => [payout.requester_id, payout])).values()]
    .slice(0, 4)
    .map((payout) => ({
      id: payout.requester_id,
      initials: getInitials(payout.requester_name).slice(0, 2),
      name: payout.requester_name,
    }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="break-words text-xl tracking-tight sm:text-2xl lg:text-3xl">SpaceCat ASTROTOURISM Finances</h1>
        <p className="text-muted-foreground text-sm">{formattedDate}</p>
      </div>

      <Tabs defaultValue="30-days" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto" variant="line">
            <TabsTrigger value="30-days">Dashboard</TabsTrigger>
            <TabsTrigger value="12-months">Accounts</TabsTrigger>
            <TabsTrigger value="custom">Transactions</TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground text-xs sm:col-span-1">
              <RotateCw className="size-4" />
              <span>{updatedLabel}</span>
            </div>
            <Button className="w-full sm:w-auto" size="sm" variant="outline" asChild>
              <Link href="/dashboard/admin/pengaturan">
                <Settings2 data-icon="inline-start" />
                Settings
              </Link>
            </Button>
            <Button className="w-full sm:w-auto" size="sm" variant="outline" asChild>
              <a href="/api/finance/export">
                <Download data-icon="inline-start" />
                Export
              </a>
            </Button>
          </div>
        </div>

        <TabsContent value="30-days" className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-6">
              <OverviewKpis data={kpis} />
            </div>

            <div className="flex flex-col gap-4 xl:col-span-6">
              <IncomeBreakdown sources={incomeSources} />
              <FinanceNotification
                title={summary.open_payouts ? "Payout queue requires attention" : "Payout queue is clear"}
                description={
                  summary.open_payouts
                    ? `${summary.open_payouts} payout request${summary.open_payouts === 1 ? "" : "s"} totaling ${currency(summary.open_payout_total)} still need completion.`
                    : "There are no payout requests waiting for review."
                }
                actionLabel="View payouts"
                actionHref="#payouts"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-7">
              <TransactionsOverviewCard
                data={chartData}
                title="Transaction Overview"
                incomeLabel="Revenue"
                expenseLabel="Payouts"
              />
            </div>
            <div className="xl:col-span-5">
              <BalanceDistributionCard balances={balances} availableCurrencies={["USD"]} title="Revenue Allocation" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <Wallet
                primaryItems={resortWallet}
                secondaryItems={payoutWallet}
                footerLabel="Settlement currency:"
                footerValue="USD"
                statusLabel="Live Data"
                title="Revenue Accounts"
              />
            </div>
            <div className="xl:col-span-4">
              <UpcomingTransactions
                transactions={payoutTransactions}
                totalAmount={totalPayoutAmount}
                highlightAmount={numberValue(summary.open_payout_total)}
                count={payablePayouts.length}
                summaryLabel="active or completed payout requests"
                highlightLabel="Open payout amount"
                highlightSuffix=""
                title="Recent Staff Payouts"
              />
            </div>
            <div className="xl:col-span-4">
              <QuickActions
                adminMode
                amount={numberValue(summary.open_payout_total).toFixed(2)}
                contactItems={contacts}
              />
            </div>
          </div>

          <StaffPayouts payouts={finance.payouts} />
        </TabsContent>

        <TabsContent value="12-months">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Accounts view coming soon.
          </div>
        </TabsContent>

        <TabsContent value="custom">
          <div className="flex h-64 items-center justify-center rounded-xl border border-border border-dashed text-muted-foreground">
            Transactions view coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
