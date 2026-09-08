export function formatLogAction(action: string) {
  return action
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatLogEntity(entityType: string) {
  return entityType
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatLogDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function formatLogSnapshot(value: unknown) {
  if (value === null || value === undefined) return "No snapshot recorded.";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function getLogActionVariant(
  action: string,
): "default" | "secondary" | "destructive" | "outline" {
  const normalized = action.toLowerCase();
  if (["delete", "cancel", "reject", "fail"].some((keyword) => normalized.includes(keyword))) {
    return "destructive";
  }
  if (["create", "complete", "approve", "login"].some((keyword) => normalized.includes(keyword))) {
    return "default";
  }
  if (["update", "change", "reschedule", "status"].some((keyword) => normalized.includes(keyword))) {
    return "secondary";
  }
  return "outline";
}
