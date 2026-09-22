"use client";

import type { ReactNode } from "react";

import { addDays, format, set } from "date-fns";
import { Banknote, ChevronRight, Zap } from "lucide-react";
import { type SimpleIcon as SimpleIconType, siClaude, siLinear, siResend } from "simple-icons";

import { SimpleIcon } from "@/components/simple-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { formatCurrency } from "@/lib/utils";

export interface UpcomingTransactionItem {
  id: string | number;
  title: string;
  date: string;
  action?: ReactNode;
}

type TransactionDisplayItem = UpcomingTransactionItem & { icon?: SimpleIconType };

const defaultTransactions: TransactionDisplayItem[] = [
  {
    id: 1,
    title: "Claude Pro Subscription",
    date: format(set(addDays(new Date(), 2), { hours: 14, minutes: 45 }), "hh.mm a '·' MMMM dd, yyyy"),
    icon: siClaude,
  },
  {
    id: 2,
    title: "Resend Pro Team",
    date: format(set(addDays(new Date(), 4), { hours: 7, minutes: 0 }), "hh.mm a '·' MMMM dd, yyyy"),
    icon: siResend,
  },
  {
    id: 3,
    title: "Linear Plus Plan",
    date: format(set(addDays(new Date(), 10), { hours: 7, minutes: 0 }), "hh.mm a '·' MMMM dd, yyyy"),
    icon: siLinear,
  },
];

export function UpcomingTransactions({
  transactions = defaultTransactions,
  totalAmount = 1245,
  highlightAmount = 145,
  count,
  summaryLabel = "bills due this month",
  highlightLabel = "Autopay will process",
  highlightSuffix = "today",
  title = "Upcoming Bills & Payments",
}: {
  transactions?: TransactionDisplayItem[];
  totalAmount?: number;
  highlightAmount?: number;
  count?: number;
  summaryLabel?: string;
  highlightLabel?: string;
  highlightSuffix?: string;
  title?: string;
}) {
  const [wholeAmount, decimalAmount = "00"] = formatCurrency(totalAmount, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).split(".");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="flex items-baseline text-3xl leading-none tracking-tight">
              <span className="font-normal">{wholeAmount}</span>
              <span className="text-muted-foreground text-xl">.{decimalAmount}</span>
            </h2>
            <p className="text-muted-foreground text-sm leading-none">
              You have <span className="font-medium text-foreground">{count ?? transactions.length}</span>{" "}
              {summaryLabel}
            </p>
          </div>
          <div className="flex w-full min-w-0 items-center gap-2 rounded-md border border-border bg-muted/70 px-2 py-1.5 text-xs sm:text-sm">
            <Zap className="size-4 fill-primary text-primary" />
            <span className="text-muted-foreground">
              {highlightLabel}{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(highlightAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>{" "}
              {highlightSuffix}
            </span>
          </div>
        </div>

        <ItemGroup>
          {transactions.map((transaction) => (
            <Item key={transaction.id} variant="outline" size="xs">
              <ItemMedia>
                <div className="grid size-9 place-items-center rounded-md border bg-background">
                  {transaction.icon ? <SimpleIcon icon={transaction.icon} /> : <Banknote className="size-5" />}
                </div>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{transaction.title}</ItemTitle>
                <ItemDescription>{transaction.date}</ItemDescription>
              </ItemContent>
              <ItemActions>
                {transaction.action ?? <ChevronRight className="size-5 text-muted-foreground" />}
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
