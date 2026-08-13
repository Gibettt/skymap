'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const PAGE_META = {
  '/dashboard/admin': { title: 'Overview', crumb: 'Dasbor' },
  '/dashboard/admin/bookings': { title: 'Daftar Booking', crumb: 'Booking - Observasi' },
  '/dashboard/admin/keuangan': { title: 'Laporan Keuangan', crumb: 'Keuangan' },
  '/dashboard/admin/payouts': { title: 'Pencairan Staff', crumb: 'Keuangan' },
  '/dashboard/admin/packages': { title: 'Packages', crumb: 'Package & Harga' },
  '/dashboard/admin/pengguna': { title: 'Manajemen Pengguna', crumb: 'Pengguna' },
  '/dashboard/admin/audit': { title: 'Audit Log', crumb: 'Keamanan' },
  '/dashboard/admin/jadwal': { title: 'Kalender', crumb: 'Booking' },
  '/dashboard/admin/sky-events': { title: 'Sky Guide', crumb: 'PWA & Kalender Langit' },
  '/dashboard/admin/alerts': { title: 'Peringatan', crumb: 'Monitoring' },
  '/dashboard/admin/pengaturan': { title: 'Pengaturan', crumb: 'Sistem' },
};

function Clock() {
  const [time, setTime] = useState({ wib: '', utc: '', date: '' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime({
        wib: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        utc: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        date: now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    };
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="header-clock">
      <div className="clock-item">
        <div className="clock-label">WIB</div>
        <div className="clock-value">{time.wib}</div>
      </div>
      <div className="clock-item">
        <div className="clock-label">UTC</div>
        <div className="clock-value">{time.utc}</div>
      </div>
      <div className="clock-item">
        <div className="clock-label">Tanggal</div>
        <div className="clock-value" style={{ fontSize: '13px', fontWeight: 600 }}>{time.date}</div>
      </div>
    </div>
  );
}

function useAdminNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/notifications', { cache: 'no-store' });
        const data = response.ok ? await response.json() : { notifications: [] };

        if (!active) return;
        setItems((data.notifications || []).map((notification) => ({
          id: notification.id,
          type: notification.type,
          href: notification.link,
          title: notification.title,
          description: notification.message,
          meta: notification.meta,
          createdAt: notification.created_at,
          readAt: notification.read_at,
        })));
      } catch {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, 15000);
    const handleVisibilityChange = () => {
      if (!document.hidden) load();
    };

    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { items, loading, setItems };
}

export default function AdminHeader() {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] || { title: 'Dashboard', crumb: 'Admin' };
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { items: notifications, loading, setItems: setNotifications } = useAdminNotifications();
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.readAt).length,
    [notifications]
  );
  const badgeLabel = useMemo(() => (unreadCount > 9 ? '9+' : String(unreadCount)), [unreadCount]);

  const markAsRead = (id) => {
    setNotifications((current) => current.map((item) => (
      item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
    )));
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <div className="header">
      <div>
        <div className="header-breadcrumb">Admin - {meta.crumb}</div>
        <div className="header-title">{meta.title}</div>
      </div>

      <Clock />

      <div className="admin-header-actions">
        <div className="admin-notification">
          <button
            type="button"
            className="btn-icon admin-notification-button"
            title="Notifikasi"
            aria-label="Buka notifikasi"
            aria-expanded={notificationOpen}
            onClick={() => setNotificationOpen((open) => !open)}
          >
            <span className="admin-bell-icon" aria-hidden="true" />
            {unreadCount > 0 && <span className="admin-notification-badge">{badgeLabel}</span>}
          </button>

          {notificationOpen && (
            <div className="admin-notification-panel">
              <div className="admin-notification-head">
                <strong>Notifikasi</strong>
                <span>{loading ? 'Memuat' : `${unreadCount} baru`}</span>
              </div>

              <div className="admin-notification-list">
                {loading && <div className="admin-notification-empty">Mengambil data notifikasi...</div>}
                {!loading && notifications.length === 0 && (
                  <div className="admin-notification-empty">Belum ada booking atau payout baru.</div>
                )}
                {!loading && notifications.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`admin-notification-item ${item.type}${item.readAt ? ' read' : ''}`}
                    onClick={() => {
                      markAsRead(item.id);
                      setNotificationOpen(false);
                    }}
                  >
                    <span className="admin-notification-dot" />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                      <em>{item.meta}</em>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link href="/dashboard/admin/pengaturan" className="admin-avatar-button" title="Pengaturan admin" aria-label="Buka pengaturan admin">
          <span className="admin-person-icon" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
