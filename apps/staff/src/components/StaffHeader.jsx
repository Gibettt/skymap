'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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
        <div className="clock-value" style={{ fontSize: '13px', fontWeight: 600 }}>{time.date}</div>
      </div>
    </div>
  );
}

export default function StaffHeader({ role = 'Internal', onNewBooking, onMenuToggle }) {
  const pathname = usePathname();
  const { language, toggleLanguage, t } = useLanguage();
  
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
      <button className="sidebar-toggle" onClick={onMenuToggle} aria-label="Toggle menu">
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>
      <div>
        <div className="header-breadcrumb">{roleLabel} · {meta.crumb}</div>
        <div className="header-title">{meta.title}</div>
      </div>

      <Clock />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showNewBooking && (
          <button className="btn btn-sm" style={{ background: roleColor, color: 'white', border: 'none', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={onNewBooking}>
            {t('btn_new_booking', '+ Booking Baru')}
          </button>
        )}

        {/* Quick Language Toggle Button */}
        <button
          type="button"
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

        <div style={{
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
