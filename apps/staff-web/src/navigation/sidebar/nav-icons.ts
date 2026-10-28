"use client";

import {
  Bell,
  Boxes,
  CalendarClock,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  MoonStar,
  Package,
  ReceiptText,
  Settings,
} from "lucide-react";

import type { NavIconName } from "./sidebar-items";

export const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  overview: LayoutDashboard,
  bookings: ClipboardList,
  packages: Package,
  calendar: CalendarDays,
  inventory: Boxes,
  invoices: ReceiptText,
  payouts: CircleDollarSign,
  "sky-guide": MoonStar,
  events: CalendarClock,
  notifications: Bell,
  settings: Settings,
};
