"use client";

import * as React from "react";

import { format, formatDistanceToNow } from "date-fns";
import {
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  ChevronRight,
  CircleDollarSign,
  MailOpen,
  MailWarning,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AdminNotification } from "@/types/notifications";

const NOTIFICATIONS_CHANGED_EVENT = "ephemeris:notifications-changed";

type NotificationFilter = "all" | "unread" | "booking" | "payout";

function NotificationIcon({ type }: { type: AdminNotification["type"] }) {
  const Icon = type === "payout" ? CircleDollarSign : CalendarCheck;
  return <Icon />;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="break-words font-medium text-sm">{value || "—"}</dd>
    </div>
  );
}

async function notificationError(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error || "Could not update the notification";
}

export function Notifications({ initialNotifications }: { initialNotifications: AdminNotification[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [filter, setFilter] = React.useState<NotificationFilter>("all");
  const [selectedId, setSelectedId] = React.useState(
    initialNotifications.find((notification) => !notification.read_at)?.id || initialNotifications[0]?.id || null,
  );
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [markingAll, setMarkingAll] = React.useState(false);

  const refreshNotifications = React.useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=200", { cache: "no-store" });
      if (!response.ok) return;
      const body = await response.json();
      if (Array.isArray(body.notifications)) setNotifications(body.notifications);
    } catch {
      // Preserve the server-rendered data if a background refresh is unavailable.
    }
  }, []);

  React.useEffect(() => setNotifications(initialNotifications), [initialNotifications]);

  React.useEffect(() => {
    const handleChanged = () => void refreshNotifications();
    const interval = window.setInterval(() => void refreshNotifications(), 60_000);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChanged);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handleChanged);
    };
  }, [refreshNotifications]);

  const counts = React.useMemo(() => ({
    all: notifications.length,
    unread: notifications.filter((notification) => !notification.read_at).length,
    booking: notifications.filter((notification) => notification.type === "booking").length,
    payout: notifications.filter((notification) => notification.type === "payout").length,
  }), [notifications]);

  const filteredNotifications = React.useMemo(() => {
    if (filter === "unread") return notifications.filter((notification) => !notification.read_at);
    if (filter === "booking" || filter === "payout") {
      return notifications.filter((notification) => notification.type === filter);
    }
    return notifications;
  }, [filter, notifications]);

  const selectedNotification = filteredNotifications.find((notification) => notification.id === selectedId)
    || filteredNotifications[0]
    || null;

  async function setReadState(notification: AdminNotification, read: boolean) {
    setPendingId(notification.id);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notification.id, markUnread: !read }),
      });
      if (!response.ok) throw new Error(await notificationError(response));
      setNotifications((current) => current.map((item) => (
        item.id === notification.id ? { ...item, read_at: read ? new Date().toISOString() : null } : item
      )));
      toast.success(read ? "Notification marked as read" : "Notification marked as unread");
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the notification");
    } finally {
      setPendingId(null);
    }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!response.ok) throw new Error(await notificationError(response));
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: readAt })));
      toast.success("All notifications marked as read");
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update notifications");
    } finally {
      setMarkingAll(false);
    }
  }

  async function openSource(notification: AdminNotification) {
    if (!notification.read_at) await setReadState(notification, true);
    if (notification.link) router.push(notification.link);
  }

  const summary = [
    { label: "Total notifications", value: counts.all, icon: Bell },
    { label: "Unread", value: counts.unread, icon: MailWarning },
    { label: "Booking updates", value: counts.booking, icon: CalendarCheck },
    { label: "Payout requests", value: counts.payout, icon: CircleDollarSign },
  ];

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardAction><Icon /></CardAction>
            </CardHeader>
            <CardContent>
              <p className="font-heading font-medium text-2xl">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0">
          <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
            <CardTitle>Notification inbox</CardTitle>
            <CardDescription>Booking and finance activity is retained here after it is read.</CardDescription>
            <CardAction>
              <Button size="sm" variant="outline" disabled={markingAll || counts.unread === 0} onClick={markAllRead}>
                {markingAll ? <Spinner data-icon="inline-start" /> : <CheckCheck data-icon="inline-start" />}
                Mark all read
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)}>
              <TabsList>
                <TabsTrigger value="all">All {counts.all}</TabsTrigger>
                <TabsTrigger value="unread">Unread {counts.unread}</TabsTrigger>
                <TabsTrigger value="booking">Bookings {counts.booking}</TabsTrigger>
                <TabsTrigger value="payout">Payouts {counts.payout}</TabsTrigger>
              </TabsList>
              <TabsContent value={filter} className="pt-2">
                {filteredNotifications.length ? (
                  <ItemGroup className="gap-2">
                    {filteredNotifications.map((notification) => (
                      <Item
                        key={notification.id}
                        variant={notification.id === selectedNotification?.id
                          ? "outline"
                          : notification.read_at
                            ? "default"
                            : "muted"}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          aria-pressed={notification.id === selectedNotification?.id}
                          onClick={() => setSelectedId(notification.id)}
                        >
                          <ItemMedia variant="icon"><NotificationIcon type={notification.type} /></ItemMedia>
                          <ItemContent>
                            <ItemTitle>
                              {notification.title}
                              {!notification.read_at ? <Badge variant="secondary">Unread</Badge> : null}
                            </ItemTitle>
                            <ItemDescription>{notification.message}</ItemDescription>
                          </ItemContent>
                          <ItemFooter>
                            <span className="truncate text-muted-foreground text-xs">{notification.meta}</span>
                            <span className="shrink-0 text-muted-foreground text-xs">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </ItemFooter>
                        </button>
                        <ItemActions>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={pendingId === notification.id}
                            aria-label={notification.read_at ? "Mark as unread" : "Mark as read"}
                            onClick={(event) => {
                              event.stopPropagation();
                              void setReadState(notification, Boolean(!notification.read_at));
                            }}
                          >
                            {pendingId === notification.id
                              ? <Spinner data-icon="inline-start" />
                              : notification.read_at
                                ? <MailWarning data-icon="inline-start" />
                                : <Check data-icon="inline-start" />}
                          </Button>
                          {notification.link ? (
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Open notification source"
                              onClick={(event) => {
                                event.stopPropagation();
                                void openSource(notification);
                              }}
                            >
                              <ChevronRight data-icon="inline-start" />
                            </Button>
                          ) : null}
                        </ItemActions>
                      </Item>
                    ))}
                  </ItemGroup>
                ) : (
                  <Empty className="min-h-72">
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><Bell /></EmptyMedia>
                      <EmptyTitle>No notifications in this view</EmptyTitle>
                      <EmptyDescription>New matching activity will appear here automatically.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="h-fit xl:sticky xl:top-[calc(var(--dashboard-header-height)+var(--spacing)*6)]">
          <CardHeader className="border-b">
            <CardTitle>Notification details</CardTitle>
            <CardDescription>Full context for the selected activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedNotification ? (
              <div className="flex flex-col gap-4">
                <Item variant="muted">
                  <ItemMedia variant="icon"><NotificationIcon type={selectedNotification.type} /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>{selectedNotification.title}</ItemTitle>
                    <ItemDescription className="line-clamp-none">{selectedNotification.message}</ItemDescription>
                  </ItemContent>
                </Item>
                <Separator />
                <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                  <Detail label="Status" value={selectedNotification.read_at ? "Read" : "Unread"} />
                  <Detail label="Type" value={selectedNotification.type === "payout" ? "Payout request" : "Booking update"} />
                  <Detail label="Received" value={format(new Date(selectedNotification.created_at), "PPpp")} />
                  <Detail label="Metadata" value={selectedNotification.meta} />
                  <Detail label="Source table" value={selectedNotification.source_table} />
                  <Detail label="Source ID" value={selectedNotification.source_id} />
                </dl>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    disabled={pendingId === selectedNotification.id}
                    onClick={() => setReadState(selectedNotification, Boolean(!selectedNotification.read_at))}
                  >
                    {pendingId === selectedNotification.id
                      ? <Spinner data-icon="inline-start" />
                      : selectedNotification.read_at
                        ? <MailWarning data-icon="inline-start" />
                        : <MailOpen data-icon="inline-start" />}
                    {selectedNotification.read_at ? "Mark as unread" : "Mark as read"}
                  </Button>
                  {selectedNotification.link ? (
                    <Button onClick={() => openSource(selectedNotification)}>
                      Open source
                      <ChevronRight data-icon="inline-end" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <Empty className="min-h-72">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Bell /></EmptyMedia>
                  <EmptyTitle>Select a notification</EmptyTitle>
                  <EmptyDescription>The complete notification context will appear here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
