"use client";

import {
  Bell,
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
  invoices: ReceiptText,
  payouts: CircleDollarSign,
  "sky-guide": Sparkles,
  notifications: Bell,
  settings: Settings,
};
