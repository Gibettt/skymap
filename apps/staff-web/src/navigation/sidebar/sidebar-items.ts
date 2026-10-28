export type StaffRole = "internal" | "external";
export type StaffAccessLevel = "full" | "scoped" | "read_only";

export type NavIconName =
  | "overview"
  | "bookings"
  | "packages"
  | "calendar"
  | "inventory"
  | "invoices"
  | "payouts"
  | "sky-guide"
  | "events"
  | "notifications"
  | "settings";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: NavIconName;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: NavIconName;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

interface StaffNavigationOptions {
  role: StaffRole;
  permissions: readonly string[];
  accessLevel: StaffAccessLevel;
}

export function getStaffSidebarItems({ role, permissions }: StaffNavigationOptions): NavGroup[] {
  const basePath = `/dashboard/${role}`;
  const can = (permission: string) => permissions.includes(permission);

  const items: NavMainItem[] = [{ id: "staff-overview", title: "Overview", url: basePath, icon: "overview" }];

  if (can("staff.bookings")) {
    items.push({ id: "staff-bookings", title: "Bookings", url: `${basePath}/bookings`, icon: "bookings" });

    items.push(
      { id: "staff-packages", title: "Packages", url: `${basePath}/package`, icon: "packages" },
      { id: "staff-calendar", title: "Calendar", url: `${basePath}/jadwal`, icon: "calendar" },
    );
    if (role === "internal") {
      items.push({ id: "staff-inventory", title: "Inventory", url: `${basePath}/inventory`, icon: "inventory" });
    }
  }

  if ((role === "internal" || role === "external") && can("staff.finance")) {
    items.push({ id: "staff-invoices", title: "Invoices", url: `${basePath}/invoices`, icon: "invoices" });
  }

  if (can("staff.finance")) {
    items.push({ id: "staff-payouts", title: "Payouts", url: `${basePath}/payout`, icon: "payouts" });
  }

  if (can("staff.sky_guide")) {
    // Sky Guide is calculated astronomy; Upcoming Events are the sessions the resort schedules.
    items.push(
      { id: "staff-sky-guide", title: "Sky Guide", url: `${basePath}/sky-guide`, icon: "sky-guide" },
      { id: "staff-upcoming-events", title: "Upcoming Events", url: `${basePath}/sky-events`, icon: "events" },
    );
  }

  if (can("staff.notifications")) {
    items.push({
      id: "staff-notifications",
      title: "Notifications",
      url: `${basePath}/notifications`,
      icon: "notifications",
    });
  }

  items.push({ id: "staff-settings", title: "Settings", url: `${basePath}/settings`, icon: "settings" });
  const label = role === "external" ? "Star Portal" : "SpaceCat ASTROTOURISM Staff";
  return [{ id: 1, label, items }];
}
