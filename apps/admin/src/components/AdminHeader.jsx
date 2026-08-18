'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminLanguage } from '@/context/AdminLanguageContext';

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

const META_KEYS = {
  Dasbor: 'page_dashboard',
  'Booking - Observasi': 'page_booking_observation',
  'Laporan Keuangan': 'page_finance_report',
  'Pencairan Staff': 'page_staff_payout',
  'Package & Harga': 'page_package_price',
  'Manajemen Pengguna': 'page_user_management',
  Keamanan: 'page_security',
  Kalender: 'nav_calendar',
  'PWA & Kalender Langit': 'page_sky_calendar',
  Peringatan: 'nav_alerts',
  Pengaturan: 'nav_settings',
  Keuangan: 'nav_finance',
  Pengguna: 'nav_users',
  Monitoring: 'page_monitoring',
  Sistem: 'page_system',
  Overview: 'nav_overview',
  Packages: 'nav_packages',
  'Audit Log': 'nav_audit',
  'Sky Guide': 'nav_sky_guide',
  Dashboard: 'page_dashboard',
  Admin: null,
};

function translateMeta(value, t) {
  const key = META_KEYS[value];
  return key ? t(key, value) : value;
}

function Clock({ language, t }) {
  const [time, setTime] = useState({ wib: '', utc: '', date: '' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime({
        wib: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        utc: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        date: now.toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    };
    const first = setTimeout(update, 0);
    const timer = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [language]);

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
        <div className="clock-label">{t('date')}</div>
        <div className="clock-value">{time.date}</div>
      </div>
    </div>
  );
}

function useAdminNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const data = response.ok ? await response.json() : { notifications: [] };

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
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (!document.hidden) load();
    }, 4000);

    const handleVisibilityChange = () => {
      if (!document.hidden) load();
    };

    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let channel = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('ephemeris_sync_channel');
        channel.onmessage = () => {
          load();
        };
      }
    } catch {
      // ignore
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channel) channel.close();
    };
  }, [load]);

  return { items, loading, setItems, reload: load };
}

export default function AdminHeader({ onNewBooking, onMenuToggle }) {
  const { language, setLanguage, t } = useAdminLanguage();
  const pathname = usePathname();
  const meta = PAGE_META[pathname] || { title: 'Dashboard', crumb: 'Admin' };
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { items: notifications, loading, setItems: setNotifications, reload: reloadNotifications } = useAdminNotifications();
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

  const markAllAsRead = (e) => {
    if (e) e.stopPropagation();
    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <div className="header">
      {/* Hamburger — visible on all screens via CSS */}
      <button className="sidebar-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>
      <div>
        <div className="header-breadcrumb">Admin - {translateMeta(meta.crumb, t)}</div>
        <div className="header-title">{translateMeta(meta.title, t)}</div>
      </div>

      <Clock language={language} t={t} />

      <div className="admin-header-actions">
        <div className="admin-notification">
          <button
            type="button"
            className="admin-notification-button"
            title={t('notifications')}
            aria-label={t('open_notifications')}
            onClick={() => {
              setNotificationOpen((open) => !open);
              reloadNotifications();
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ display: 'block' }}
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unreadCount > 0 && <span className="admin-notification-badge">{badgeLabel}</span>}
          </button>

          {notificationOpen && (
            <div className="admin-notification-panel">
              <div className="admin-notification-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <strong>{t('notifications')}</strong>
                  <span style={{ marginLeft: 6 }}>{loading ? t('loading') : t('new_count').replace('{count}', unreadCount)}</span>
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--accent, #3b82f6)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {t('mark_all_read', 'Tandai Semua Dibaca')}
                  </button>
                )}
              </div>

              <div className="admin-notification-list">
                {loading && <div className="admin-notification-empty">{t('loading_notifications')}</div>}
                {!loading && notifications.length === 0 && (
                  <div className="admin-notification-empty">{t('no_notifications')}</div>
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

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          title={t('toggle_language')}
          onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
        >
          {language === 'en' ? 'ID' : 'EN'}
        </button>

        <Link href="/dashboard/admin/pengaturan" className="admin-avatar-button" title={t('admin_settings')} aria-label={t('admin_settings')}>
          <span className="admin-person-icon" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
