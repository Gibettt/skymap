import type { StaffRole } from "@/navigation/sidebar/sidebar-items";

const STAFF_NOTIFICATION_ROUTES: Record<string, string> = {
  alerts: "notifications",
  bookings: "bookings",
  calendar: "jadwal",
  finance: "payout",
  invoices: "invoices",
  invoice: "invoices",
  jadwal: "jadwal",
  keuangan: "payout",
  notifications: "notifications",
  package: "package",
  packages: "package",
  payout: "payout",
  payouts: "payout",
  pengaturan: "settings",
  settings: "settings",
};

export function staffNotificationHref(link: string | null, role: StaffRole, type?: string) {
  const basePath = `/dashboard/${role}`;
  if (!link?.startsWith("/")) return basePath;

  const target = new URL(link, "http://staff.local");
  const route = target.pathname.match(/^\/dashboard\/(?:admin|internal|external)\/([^/]+)/)?.[1];

  if (route === "sky-events" && role === "internal") {
    return `${basePath}/sky-events${target.search}`;
  }

  if (route === "invoices" || route === "invoice") {
    const search = new URLSearchParams(target.search);
    if (type === "invoice" && !search.has("view") && !search.has("tab") && !search.has("payment")) {
      search.set("view", "monthly");
    }
    const queryString = search.toString();
    return `${basePath}/invoices${queryString ? `?${queryString}` : ""}`;
  }

  return route && STAFF_NOTIFICATION_ROUTES[route]
    ? `${basePath}/${STAFF_NOTIFICATION_ROUTES[route]}${target.search}`
    : basePath;
}
