"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatDistanceToNow } from "date-fns";
import { Bell, CalendarCheck, CheckCheck, CircleDollarSign } from "lucide-react";

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
  const Icon = type === "payout" ? CircleDollarSign : CalendarCheck;
  return <Icon />;
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
    router.push(staffNotificationHref(notification.link, role));
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
      <ItemGroup className="gap-1 p-1.5">
        {notifications.map((notification) => (
          <Item key={notification.id} asChild size="sm" variant={notification.read_at ? "default" : "muted"}>
            <button type="button" className="text-left" onClick={() => openNotification(notification)}>
              <ItemMedia variant="icon">
                <NotificationIcon type={notification.type} />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{notification.title}</ItemTitle>
                <ItemDescription>{notification.message}</ItemDescription>
              </ItemContent>
              <ItemFooter>
                <span className="truncate text-muted-foreground text-xs">{notification.meta}</span>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </ItemFooter>
            </button>
          </Item>
        ))}
      </ItemGroup>
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
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-start justify-between gap-3 p-3">
          <PopoverHeader>
            <PopoverTitle>Notifications</PopoverTitle>
            <PopoverDescription>
              {unreadCount ? `${unreadCount} unread notifications` : "You're all caught up"}
            </PopoverDescription>
          </PopoverHeader>
          {readOnly ? null : (
            <Button size="sm" variant="ghost" disabled={markingAll || unreadCount === 0} onClick={markAllRead}>
              {markingAll ? <Spinner data-icon="inline-start" /> : <CheckCheck data-icon="inline-start" />}
              Mark all read
            </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-80">{notificationContent}</ScrollArea>
        <Separator />
        <div className="p-2">
          <Button className="w-full" variant="ghost" asChild onClick={() => setOpen(false)}>
            <Link href={`/dashboard/${role}/notifications`}>View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
