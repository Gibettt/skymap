'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, CheckCheck, Languages, PanelLeft, Plus } from 'lucide-react';
import { getObservationBySlug } from '@/data/observations';
import { useLanguage } from '@/context/LanguageContext';

function useStaffNotifications() {
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
        readAt: notification.read_at,
      })));
    } catch {
      // Header tetap dapat dipakai saat notifikasi gagal dimuat.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => { if (!document.hidden) load(); }, 4000);
    const handleVisibilityChange = () => { if (!document.hidden) load(); };
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let channel = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('ephemeris_sync_channel');
        channel.onmessage = load;
      }
    } catch {
      // Sinkronisasi antar-tab bersifat opsional.
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', load);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channel?.close();
    };
  }, [load]);

  return { items, loading, setItems, reload: load };
}

export default function StaffHeader({ role = 'Internal', onMenuToggle }) {
  const pathname = usePathname();
  const { language, toggleLanguage, t } = useLanguage();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { items: notifications, loading, setItems: setNotifications, reload } = useStaffNotifications();
  const unreadCount = useMemo(() => notifications.filter((item) => !item.readAt).length, [notifications]);

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

  const markAllAsRead = (event) => {
    event?.stopPropagation();
    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || now })));
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAll: true }),
      keepalive: true,
    }).catch(() => {});
  };

  const getPageInfo = () => {
    if (pathname.includes('/observations/')) {
      const observation = getObservationBySlug(pathname.split('/observations/')[1]);
      return { title: observation?.title ?? t('nav_package', 'Package'), crumb: t('nav_package', 'Package') };
    }
    if (pathname.endsWith('/form-booking')) return { title: t('nav_booking_form', 'Form Booking'), crumb: t('nav_bookings', 'Booking') };
    if (pathname.endsWith('/bookings')) return { title: t('nav_bookings', 'My Bookings'), crumb: t('nav_bookings', 'Booking') };
    if (pathname.endsWith('/payout')) return { title: t('nav_payout', 'Payout'), crumb: t('nav_payout', 'Payout') };
    if (pathname.endsWith('/jadwal')) return { title: t('nav_calendar', 'Calendar'), crumb: t('nav_calendar', 'Calendar') };
    if (pathname.endsWith('/sky-events')) return { title: t('nav_sky_guide', 'Sky Guide'), crumb: t('page_sky_calendar', 'PWA & Kalender Langit') };
    if (pathname.endsWith('/package')) return { title: t('nav_package', 'Package'), crumb: t('nav_package', 'Package') };
    if (pathname.endsWith('/settings')) return { title: t('nav_settings', 'Settings'), crumb: t('nav_settings', 'Settings') };
    return { title: t('nav_dashboard', 'Overview'), crumb: t('nav_dashboard', 'Dashboard') };
  };

  const meta = getPageInfo();
  const basePath = `/dashboard/${role.toLowerCase()}`;
  const showNewBooking = pathname.endsWith('/bookings') || pathname === basePath;
  const roleLabel = role === 'Internal' ? t('role_internal', 'Staff Internal') : t('role_external', 'Staff External');

  return (
    <header className="header">
      <div className="staff-header-nav">
        <button type="button" className="sidebar-toggle" onClick={onMenuToggle} aria-label={t('accessibility_toggle_menu')}>
          <PanelLeft aria-hidden="true" />
        </button>
        <div className="header-title">{meta.title}</div>

        <div className="staff-header-actions">
          {showNewBooking && (
            <Link href={`${basePath}/form-booking`} className="btn btn-sm btn-primary staff-new-booking">
              <Plus aria-hidden="true" />
              <span>{t('btn_new_booking', 'Booking Baru')}</span>
            </Link>
          )}

          <div className="staff-notification">
            <button
              type="button"
              className="staff-notification-button"
              title={t('notifications', 'Notifikasi')}
              aria-label={t('open_notifications', 'Buka notifikasi')}
              aria-expanded={notificationOpen}
              onClick={() => { setNotificationOpen((open) => !open); reload(); }}
            >
              <Bell aria-hidden="true" />
              {unreadCount > 0 && <span className="staff-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {notificationOpen && (
              <div className="staff-notification-panel">
                <div className="staff-notification-head">
                  <div>
                    <strong>{t('notifications', 'Notifikasi')}</strong>
                    <span>{loading ? t('loading_notifications', 'Memuat...') : t('notification_new_count', '{count} baru').replace('{count}', unreadCount)}</span>
                  </div>
                  {unreadCount > 0 && (
                    <button type="button" onClick={markAllAsRead} className="staff-notification-read-all">
                      <CheckCheck aria-hidden="true" />
                      {t('mark_all_read', 'Tandai dibaca')}
                    </button>
                  )}
                </div>
                <div className="staff-notification-list">
                  {loading && <div className="staff-notification-empty">{t('loading_notifications', 'Mengambil data notifikasi...')}</div>}
                  {!loading && notifications.length === 0 && <div className="staff-notification-empty">{t('no_notifications', 'Belum ada notifikasi baru.')}</div>}
                  {!loading && notifications.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`staff-notification-item ${item.type}${item.readAt ? ' read' : ''}`}
                      onClick={() => { markAsRead(item.id); setNotificationOpen(false); }}
                    >
                      <span className="staff-notification-dot" />
                      <span><strong>{item.title}</strong><small>{item.description}</small><em>{item.meta}</em></span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="button" className="staff-language-toggle" onClick={toggleLanguage} title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}>
            <Languages aria-hidden="true" />
            <span>{language.toUpperCase()}</span>
          </button>
          <div className="staff-avatar" title={roleLabel}>{role === 'Internal' ? 'AF' : 'BS'}</div>
        </div>
      </div>

      <div className="staff-header-options">
        <span className="staff-header-role-dot" aria-hidden="true" />
        <span>{roleLabel}</span>
        <span className="staff-header-separator" aria-hidden="true">/</span>
        <strong>{meta.crumb}</strong>
      </div>
    </header>
  );
}
