export type StaffRole = "internal" | "external";
export type StaffAccessLevel = "full" | "scoped" | "read_only";

export type NavIconName =
  | "overview"
  | "bookings"
  | "packages"
  | "calendar"
  | "invoices"
  | "payouts"
  | "sky-guide"
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
  }

  if (role === "internal" && can("staff.finance")) {
    items.push({ id: "staff-invoices", title: "Invoices", url: `${basePath}/invoices`, icon: "invoices" });
  }

  if (can("staff.finance")) {
    items.push({ id: "staff-payouts", title: "Payouts", url: `${basePath}/payout`, icon: "payouts" });
  }

  if (role === "internal" && can("staff.sky_guide")) {
    items.push({ id: "staff-sky-guide", title: "Sky Guide", url: `${basePath}/sky-events`, icon: "sky-guide" });
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

  return [{ id: 1, label: "Ephemeris Staff", items }];
}
