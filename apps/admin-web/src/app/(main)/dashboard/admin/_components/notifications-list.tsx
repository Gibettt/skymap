"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

import { formatDate } from "../_lib/format";

interface Notification {
  id: string;
  title: string;
  message: string;
  meta?: string | null;
  link?: string | null;
  read_at?: string | null;
  created_at: string;
}

export function NotificationsList({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const unread = notifications.filter((notification) => !notification.read_at).length;

  async function markAll() {
    setPending(true);
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    setPending(false);
    if (!response.ok) {
      toast.error("Notifikasi gagal diperbarui.");
      return;
    }
    toast.success("Semua notifikasi ditandai dibaca.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Notifikasi operasional</CardTitle>
        <CardDescription>{unread} notifikasi belum dibaca</CardDescription>
        <CardAction>
          <Button size="sm" variant="outline" onClick={markAll} disabled={pending || unread === 0}>
            <CheckCheck data-icon="inline-start" />
            Tandai semua dibaca
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        {notifications.length ? (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{notification.title}</p>
                    {!notification.read_at && <span className="size-2 rounded-full bg-primary" title="Belum dibaca" />}
                  </div>
                  <p className="text-muted-foreground text-sm">{notification.message}</p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {[notification.meta, formatDate(notification.created_at, true)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {notification.link && (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={notification.link}>Buka</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty className="min-h-64">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>Tidak ada peringatan</EmptyTitle>
              <EmptyDescription>Notifikasi booking dan payout akan muncul di sini.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
