'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const HEARTBEAT_INTERVAL_MS = 25_000;
const ACTIVE_WINDOW_MS = 120_000;

export default function StaffPresence() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith('/dashboard/');

  useEffect(() => {
    if (!isDashboard) return undefined;

    let lastActivity = Date.now();
    const markActive = () => { lastActivity = Date.now(); };
    const sendHeartbeat = () => {
      const active = document.visibilityState === 'visible'
        && Date.now() - lastActivity < ACTIVE_WINDOW_MS;
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {});
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') markActive();
      sendHeartbeat();
    };

    for (const eventName of ['pointerdown', 'keydown', 'scroll']) {
      window.addEventListener(eventName, markActive, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibility);
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      for (const eventName of ['pointerdown', 'keydown', 'scroll']) {
        window.removeEventListener(eventName, markActive);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isDashboard]);

  return null;
}
