import { TrendingUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";

export function FinanceNotification({
  title = "Credit score updated",
  description = "Your score increased by 14 points to 782.",
  actionLabel = "View details",
  actionHref,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Item className="flex-col items-stretch rounded-xl sm:flex-row sm:items-center" variant="outline">
      <ItemMedia variant="icon">
        <TrendingUp />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
      <ItemActions className="w-full sm:w-auto">
        {actionHref ? (
          <Button className="w-full sm:w-auto" size="sm" variant="outline" asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button className="w-full sm:w-auto" size="sm" variant="outline">
            {actionLabel}
          </Button>
        )}
      </ItemActions>
    </Item>
  );
}
