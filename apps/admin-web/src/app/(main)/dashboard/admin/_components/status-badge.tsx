import { Badge } from "@/components/ui/badge";

import { titleCase } from "../_lib/format";

const destructiveStatuses = new Set(["rejected", "cancelled", "cancelled_by_guest", "cancelled_weather", "offline"]);
const outlineStatuses = new Set([
  "pending",
  "requested",
  "inactive",
  "idle",
  "needs_both",
  "needs_internal",
  "needs_external",
]);
const secondaryStatuses = new Set(["processed", "rescheduled"]);

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const status = String(value ?? "unknown").toLowerCase();
  let variant: "default" | "destructive" | "outline" | "secondary" = "default";
  if (destructiveStatuses.has(status)) variant = "destructive";
  else if (outlineStatuses.has(status)) variant = "outline";
  else if (secondaryStatuses.has(status)) variant = "secondary";

  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}
