"use client";

import {
  Bell,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  type LucideIcon,
  Package,
  ReceiptText,
  Settings,
  Sparkles,
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
  "sky-guide": Sparkles,
  notifications: Bell,
  settings: Settings,
};
