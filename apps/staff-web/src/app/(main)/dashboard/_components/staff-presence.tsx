"use client";

import * as React from "react";

const HEARTBEAT_INTERVAL_MS = 25_000;
const ACTIVE_WINDOW_MS = 120_000;

export function StaffPresence() {
  React.useEffect(() => {
    let lastActivity = Date.now();

    function markActive() {
      lastActivity = Date.now();
    }

    function sendHeartbeat() {
      const active = document.visibilityState === "visible" && Date.now() - lastActivity < ACTIVE_WINDOW_MS;

      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
        cache: "no-store",
        keepalive: true,
      }).catch(() => {
        // Presence is best-effort and must never interrupt staff work.
      });
    }

    function handleFocus() {
      markActive();
      sendHeartbeat();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") markActive();
      sendHeartbeat();
    }

    for (const eventName of ["pointerdown", "keydown", "scroll"] as const) {
      window.addEventListener(eventName, markActive, { passive: true });
    }
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      for (const eventName of ["pointerdown", "keydown", "scroll"] as const) {
        window.removeEventListener(eventName, markActive);
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
