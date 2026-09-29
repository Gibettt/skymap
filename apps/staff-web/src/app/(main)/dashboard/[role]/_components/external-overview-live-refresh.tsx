"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";

import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";

const REFRESH_INTERVAL_MS = 15_000;
const MIN_REFRESH_GAP_MS = 2_000;

export function ExternalOverviewLiveRefresh() {
  const router = useRouter();
  const lastRefreshRef = useRef(0);
  const [, startTransition] = useTransition();

  const refresh = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_REFRESH_GAP_MS) return;
    lastRefreshRef.current = now;
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const handleFocus = () => refresh();
    const handleDataChange = () => refresh();
    let channel: BroadcastChannel | null = null;

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("ephemeris:notifications-changed", handleDataChange);

    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("ephemeris_sync_channel");
        channel.addEventListener("message", handleDataChange);
      }
    } catch {
      // Periodic refresh remains active when BroadcastChannel is unavailable.
    }

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("ephemeris:notifications-changed", handleDataChange);
      channel?.removeEventListener("message", handleDataChange);
      channel?.close();
    };
  }, [refresh]);

  return (
    <Badge
      title="Dashboard data refreshes automatically"
      className="border-emerald-300/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/10"
    >
      <span className="relative mr-0.5 flex size-2" aria-hidden="true">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
      </span>
      Live
    </Badge>
  );
}
