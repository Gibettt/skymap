import {
  Bell,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  Lock,
  type LucideIcon,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
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

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "SpaceCat ASTROTOURISM Admin",
    items: [
      { id: "ephemeris-overview", title: "Overview", url: "/dashboard/admin", icon: LayoutDashboard },
      { id: "ephemeris-bookings", title: "Bookings", url: "/dashboard/admin/bookings", icon: ClipboardList },
      { id: "ephemeris-resorts", title: "Partner Resorts", url: "/dashboard/admin/resorts", icon: Building2 },
      { id: "ephemeris-finance", title: "Finance", url: "/dashboard/admin/finance", icon: CircleDollarSign },
      { id: "ephemeris-invoices", title: "Invoices", url: "/dashboard/admin/invoices", icon: ReceiptText },
      { id: "ephemeris-packages", title: "Packages", url: "/dashboard/admin/packages", icon: Package },
      { id: "ephemeris-users", title: "Users", url: "/dashboard/admin/users", icon: Users },
      { id: "ephemeris-roles", title: "Roles", url: "/dashboard/admin/roles", icon: Lock },
      { id: "ephemeris-logs", title: "Logs", url: "/dashboard/admin/logs", icon: ScrollText },
      { id: "ephemeris-calendar", title: "Calendar", url: "/dashboard/admin/calendar", icon: CalendarDays },
      { id: "ephemeris-notifications", title: "Notifications", url: "/dashboard/admin/notifications", icon: Bell },
      { id: "ephemeris-settings", title: "Pengaturan", url: "/dashboard/admin/pengaturan", icon: Settings },
    ],
  },
];
