'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getObservationBySlug } from '@/data/observations';
import { useLanguage } from '@/context/LanguageContext';

function Clock() {
  const { language, t } = useLanguage();
  const [time, setTime] = useState({ wib: '', utc: '', date: '' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const utcNow = new Date(now.getTime());
      const locale = language === 'en' ? 'en-US' : 'id-ID';
      setTime({
        wib: now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        utc: utcNow.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        date: now.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    };
    const first = setTimeout(update, 0);
    const tInterval = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(tInterval);
    };
  }, [language]);

  return (
    <div className="header-clock">
      <div className="clock-item">
        <div className="clock-label">{t('clock_wib', 'WIB')}</div>
        <div className="clock-value">{time.wib}</div>
      </div>
      <div className="clock-item">
        <div className="clock-label">{t('clock_utc', 'UTC')}</div>
        <div className="clock-value">{time.utc}</div>
      </div>
      <div className="clock-item">
        <div className="clock-label">{t('clock_date', 'Tanggal')}</div>
        <div className="clock-value">{time.date}</div>
      </div>
    </div>
  );
}

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

export default function StaffHeader({ role = 'Internal', onNewBooking, onMenuToggle }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, toggleLanguage, t } = useLanguage();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { items: notifications, loading, setItems: setNotifications, reload: reloadNotifications } = useStaffNotifications();

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

  const getPageInfo = () => {
    if (pathname.includes('/observations/')) {
      const slug = pathname.split('/observations/')[1];
      const exp = getObservationBySlug(slug);
      return { title: exp?.title ?? t('nav_package', 'Package'), crumb: t('nav_package', 'Package') };
    }
    if (pathname.endsWith('/form-booking')) return { title: t('nav_booking_form', 'Form Booking'), crumb: t('nav_booking_form', 'Booking') };
    if (pathname.endsWith('/bookings')) return { title: 'My Bookings', crumb: 'Reservasi' };
    if (pathname.endsWith('/payout')) return { title: t('nav_payout', 'Payout'), crumb: t('nav_payout', 'Payout') };
    if (pathname.endsWith('/jadwal')) return { title: t('nav_calendar', 'Calendar'), crumb: t('nav_calendar', 'Calendar') };
    if (pathname.endsWith('/package')) return { title: t('nav_package', 'Package'), crumb: t('nav_package', 'Package') };
    if (pathname.endsWith('/settings')) return { title: t('nav_settings', 'Settings'), crumb: t('nav_settings', 'Settings') };
    return { title: t('nav_dashboard', 'Overview'), crumb: t('nav_dashboard', 'Dasbor') };
  };

  const meta = getPageInfo();
  const showNewBooking = pathname.endsWith('/bookings') || pathname === `/dashboard/${role.toLowerCase()}`;
  const roleColor = role === 'Internal' ? '#0891b2' : '#7c3aed';
  const roleLabel = role === 'Internal' ? t('role_internal', 'Staff Internal') : t('role_external', 'Staff External');

  return (
    <div className="header">
      {/* Hamburger — visible only on mobile via CSS */}
      <button className="sidebar-toggle" onClick={onMenuToggle} aria-label={t('accessibility_toggle_menu')}>
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>
      <div className="header-copy">
        <div className="header-breadcrumb">{roleLabel} · {meta.crumb}</div>
        <div className="header-title">{meta.title}</div>
      </div>

      <Clock />

      {/* Actions */}
      <div className="staff-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showNewBooking && (
          <Link
            href={`/dashboard/${role.toLowerCase()}/form-booking`}
            className="btn btn-sm"
            style={{
              background: roleColor,
              color: 'white',
              border: 'none',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {t('btn_new_booking', '+ Booking Baru')}
          </Link>
        )}

        {/* Notifikasi Bell — untuk Staff Internal & External */}
        <div className="staff-notification">
          <button
            type="button"
            className="staff-notification-button"
            title={t('notifications', 'Notifikasi')}
            aria-label={t('open_notifications', 'Buka notifikasi')}
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
            {unreadCount > 0 && <span className="staff-notification-badge">{badgeLabel}</span>}
          </button>

          {notificationOpen && (
            <div className="staff-notification-panel">
              <div className="staff-notification-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <strong>{t('notifications', 'Notifikasi')}</strong>
                  <span style={{ marginLeft: 6 }}>{loading ? t('loading_notifications', 'Memuat...') : t('notification_new_count', '{count} baru').replace('{count}', unreadCount)}</span>
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
                      color: roleColor,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {t('mark_all_read', 'Tandai Semua Dibaca')}
                  </button>
                )}
              </div>

              <div className="staff-notification-list">
                {loading && <div className="staff-notification-empty">{t('loading_notifications', 'Mengambil data notifikasi...')}</div>}
                {!loading && notifications.length === 0 && (
                  <div className="staff-notification-empty">{t('no_notifications', 'Belum ada notifikasi baru.')}</div>
                )}
                {!loading && notifications.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`staff-notification-item ${item.type}${item.readAt ? ' read' : ''}`}
                    onClick={() => {
                      markAsRead(item.id);
                      setNotificationOpen(false);
                    }}
                  >
                    <span className="staff-notification-dot" />
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

        {/* Quick Language Toggle Button */}
        <button
          type="button"
          className="staff-language-toggle"
          onClick={toggleLanguage}
          title={language === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
          style={{
            padding: '5px 9px',
            fontSize: '11px',
            fontWeight: 800,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s ease',
          }}
        >
          <span>{language === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}</span>
        </button>

        <div className="staff-avatar" style={{
          width: '36px', height: '36px', background: roleColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: 'white', cursor: 'pointer', flexShrink: 0,
        }} title={`${role === 'Internal' ? 'Ahmad Fauzi' : 'Budi Santoso'} — ${roleLabel}`}>
          {role === 'Internal' ? 'AF' : 'BS'}
        </div>
      </div>
    </div>
  );
}
