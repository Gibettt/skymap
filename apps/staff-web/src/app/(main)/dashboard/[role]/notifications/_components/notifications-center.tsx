"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, CircleAlert, Inbox } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { staffNotificationHref } from "@/lib/notification-route";
import type { StaffRole } from "@/lib/staff-access";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  meta: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type Filter = "all" | "unread" | "read";

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function typeLabel(type: string) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function NotificationsCenter({ role, readOnly }: { role: StaffRole; readOnly: boolean }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (page = 1, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/notifications?page=${page}&limit=30&filter=${filter}`, {
          cache: "no-store",
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Unable to load notifications");
        const nextNotifications = (payload.notifications ?? []) as Notification[];
        setNotifications((current) => {
          if (!append) return nextNotifications;
          const existing = new Set(current.map((notification) => notification.id));
          return [...current, ...nextNotifications.filter((notification) => !existing.has(notification.id))];
        });
        setUnreadCount(Number(payload.unreadCount ?? 0));
        setPagination(payload.pagination ?? { page, limit: 30, total: nextNotifications.length, totalPages: 1 });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load notifications");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === "unread") return notifications.filter((notification) => !notification.read_at);
    if (filter === "read") return notifications.filter((notification) => notification.read_at);
    return notifications;
  }, [filter, notifications]);

  const markRead = async (ids?: string[]) => {
    if (readOnly) return false;
    const marker = ids?.[0] ?? "all";
    const newlyReadCount = ids
      ? notifications.filter((notification) => ids.includes(notification.id) && !notification.read_at).length
      : unreadCount;
    setWorking(marker);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(ids ? { ids } : { markAll: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to update notifications");
      const updatedIds = ids ?? notifications.map((notification) => notification.id);
      const updatedIdSet = new Set(updatedIds);
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          updatedIdSet.has(notification.id) && !notification.read_at
            ? { ...notification, read_at: readAt }
            : notification,
        ),
      );
      setUnreadCount((current) => (ids ? Math.max(0, current - newlyReadCount) : 0));
      window.dispatchEvent(new CustomEvent("ephemeris:notifications-changed"));
      return true;
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : "Unable to update notifications");
      return false;
    } finally {
      setWorking(null);
    }
  };

  const openNotification = async (notification: Notification) => {
    if (!notification.read_at && !readOnly) await markRead([notification.id]);
    router.push(staffNotificationHref(notification.link, role));
  };

  let notificationContent: React.ReactNode;
  if (loading) {
    notificationContent = (
      <div className="space-y-3 py-2">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  } else if (error) {
    notificationContent = (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlert />
          </EmptyMedia>
          <EmptyTitle>Notifications could not be loaded</EmptyTitle>
          <EmptyDescription>{error}</EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={() => void load()}>
          Try again
        </Button>
      </Empty>
    );
  } else if (visible.length) {
    notificationContent = (
      <div className="space-y-4">
        <ItemGroup>
          {visible.map((notification) => (
            <Item key={notification.id} variant={notification.read_at ? "default" : "muted"} className="relative">
              <button
                type="button"
                className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open notification: ${notification.title}`}
                onClick={() => void openNotification(notification)}
              />
              <ItemMedia variant="icon" className="pointer-events-none relative rounded-lg border bg-background p-2">
                <Bell className="size-4" />
              </ItemMedia>
              <ItemContent className="pointer-events-none relative">
                <ItemTitle>
                  {notification.title}
                  {!notification.read_at ? (
                    <>
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                      <span className="sr-only">Unread</span>
                    </>
                  ) : null}
                </ItemTitle>
                <ItemDescription>{notification.message}</ItemDescription>
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                  <Badge variant="outline">{typeLabel(notification.type)}</Badge>
                  <span>{formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}</span>
                  {notification.meta ? <span>· {notification.meta}</span> : null}
                </div>
              </ItemContent>
              <ItemActions className="relative z-10">
                {!notification.read_at && !readOnly ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={working === notification.id}
                    onClick={() => void markRead([notification.id])}
                  >
                    Mark read
                  </Button>
                ) : null}
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
        {pagination.page < pagination.totalPages ? (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={loadingMore}
              onClick={() => void load(pagination.page + 1, true)}
            >
              {loadingMore ? "Loading…" : `Load more (${notifications.length} of ${pagination.total})`}
            </Button>
          </div>
        ) : null}
      </div>
    );
  } else {
    notificationContent = (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>No {filter === "all" ? "" : `${filter} `}notifications</EmptyTitle>
          <EmptyDescription>
            {filter === "unread"
              ? "There is nothing waiting for your attention."
              : "Notifications will appear here when activity occurs."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-semibold text-2xl tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            Review booking updates, operational changes, and account activity.
          </p>
        </div>
        {!readOnly ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!unreadCount || working === "all"}
            onClick={() => void markRead()}
          >
            <CheckCheck />
            Mark all as read
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Inbox</CardTitle>
          <CardDescription>
            {unreadCount
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
              : "You are all caught up"}
          </CardDescription>
          <div className="pt-3">
            <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
              <TabsList variant="line">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="read">Read</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>{notificationContent}</CardContent>
      </Card>
    </div>
  );
}
