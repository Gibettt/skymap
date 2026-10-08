"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatDistanceToNow } from "date-fns";
import { Bell, Calendar, CalendarCheck, CheckCheck, CircleDollarSign, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { staffNotificationHref } from "@/lib/notification-route";
import type { StaffRole } from "@/navigation/sidebar/sidebar-items";
import type { AdminNotification } from "@/types/notifications";

const NOTIFICATIONS_CHANGED_EVENT = "ephemeris:notifications-changed";

function NotificationIcon({ type }: { type: AdminNotification["type"] }) {
  if (type === "payout") return <CircleDollarSign className="size-4.5 text-emerald-300" />;
  if (type === "invoice") return <ReceiptText className="size-4.5 text-violet-300" />;
  return <Calendar className="size-4.5 text-cyan-300" />;
}

export function NotificationCenter({ role, readOnly }: { role: StaffRole; readOnly: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [markingAll, setMarkingAll] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=8", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      const nextNotifications = Array.isArray(body.notifications) ? body.notifications : [];
      setNotifications(nextNotifications);
      setUnreadCount(
        Number.isFinite(Number(body.unreadCount))
          ? Number(body.unreadCount)
          : nextNotifications.filter((notification: AdminNotification) => !notification.read_at).length,
      );
    } catch {
      // Keep the last successfully loaded state during a transient network failure.
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => void loadNotifications(), 60_000);
    const handleChanged = () => void loadNotifications();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChanged);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChanged);
    };
  }, [loadNotifications]);

  async function markAllRead() {
    if (readOnly) return;
    setMarkingAll(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!response.ok) return;
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: readAt })));
      setUnreadCount(0);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch {
      // Leave the current unread state intact when the update could not be saved.
    } finally {
      setMarkingAll(false);
    }
  }

  async function openNotification(notification: AdminNotification) {
    if (!notification.read_at && !readOnly) {
      try {
        const response = await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notification.id }),
        });
        if (response.ok) {
          setNotifications((current) =>
            current.map((item) =>
              item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item,
            ),
          );
          setUnreadCount((current) => Math.max(0, current - 1));
          window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
        }
      } catch {
        // Opening the source should still work even if the read status could not be saved.
      }
    }
    setOpen(false);
    router.push(staffNotificationHref(notification.link, role, notification.type));
  }

  let notificationContent: React.ReactNode;
  if (loading) {
    notificationContent = (
      <Empty className="min-h-80">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>Loading notifications</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  } else if (notifications.length) {
    notificationContent = (
      <div className="flex flex-col gap-2 p-2.5">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            className={`w-full rounded-xl border p-3 text-left transition-all relative ${
              notification.read_at
                ? "border-cyan-400/15 bg-[#061b3b]/70 hover:bg-[#0c2650] hover:border-cyan-400/35"
                : "border-cyan-400/35 bg-[#092452]/90 hover:bg-[#0e2f65] hover:border-cyan-400/50 shadow-sm"
            }`}
            onClick={() => openNotification(notification)}
          >
            {!notification.read_at ? (
              <span className="absolute top-3 right-3 size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            ) : null}
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-lg border border-cyan-400/35 bg-cyan-400/10 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                <NotificationIcon type={notification.type} />
              </div>
              <div className="min-w-0 flex-1 pr-2">
                <p className="font-semibold text-sm text-white leading-tight truncate">
                  {notification.title}
                </p>
                <p className="text-xs text-slate-300 mt-1 leading-snug line-clamp-2">
                  {notification.message}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 pt-0.5">
                  <span className="truncate pr-2">{notification.meta || "Notification"}</span>
                  <span className="shrink-0 font-mono text-[10px]">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  } else {
    notificationContent = (
      <Empty className="min-h-80">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Bell />
          </EmptyMedia>
          <EmptyTitle>No notifications</EmptyTitle>
          <EmptyDescription>Booking and payout updates will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) void loadNotifications();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          className="relative"
          size="icon"
          aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        >
          <Bell data-icon="inline-start" />
          {unreadCount > 0 ? (
            <Badge
              className="pointer-events-none absolute -top-1 -right-1 h-4 min-w-4 px-1"
              variant="secondary"
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-staff-notification-popover={role}
        align="end"
        className="w-[min(26rem,calc(100vw-2rem))] gap-0 p-0 rounded-2xl border border-cyan-400/25 bg-[#051530]/98 backdrop-blur-2xl shadow-2xl overflow-hidden text-white"
      >
        <div className="flex items-start justify-between gap-3 p-3.5 border-b border-cyan-400/20 bg-[#071b3b]/60">
          <div>
            <h4 className="font-semibold text-base text-white">Notifications</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {unreadCount ? `${unreadCount} unread notifications` : "You're all caught up"}
            </p>
          </div>
          {readOnly ? null : (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-slate-400 hover:text-white hover:bg-white/10 h-7 px-2"
              disabled={markingAll || unreadCount === 0}
              onClick={markAllRead}
            >
              {markingAll ? <Spinner data-icon="inline-start" className="size-3" /> : <CheckCheck data-icon="inline-start" className="size-3.5" />}
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[22rem] min-h-60 overflow-y-auto">{notificationContent}</ScrollArea>
        <div className="p-2.5 border-t border-cyan-400/20 bg-[#071b3b]/60">
          <Button
            className="w-full rounded-xl border border-cyan-400/25 bg-[#051633]/80 text-slate-200 text-xs font-medium py-2 hover:bg-[#0a2046] hover:text-white hover:border-cyan-400/40 transition-all"
            variant="outline"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href={`/dashboard/${role}/notifications`}>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
