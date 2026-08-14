'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { STATION_DATA } from '@/data/stations';
import { useLanguage } from '@/context/LanguageContext';

export default function StaffSidebar({ role = 'Internal', bookingCount = 0, isOpen = false, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [payoutAvailableUsd, setPayoutAvailableUsd] = useState(0);
  const basePath = `/dashboard/${role.toLowerCase()}`;
  const isInternal = role === 'Internal';

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [pathname, onClose]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // tetap lanjut ke halaman login walau API logout gagal
    }
    router.push('/login');
  };

  const NAV_ITEMS = [
    { href: basePath, label: t('nav_dashboard', 'Dashboard'), icon: '*', exact: true },
    { href: `${basePath}/form-booking`, label: t('nav_booking_form', 'Form Booking'), icon: '+' },
    { href: `${basePath}/package`, label: t('nav_package', 'Package'), icon: '+', activePaths: [`${basePath}/observations`] },
    { href: `${basePath}/payout`, label: t('nav_payout', 'Payout'), icon: '$', badge: payoutAvailableUsd > 0 ? `$${Math.floor(payoutAvailableUsd)}` : '' },
    { href: `${basePath}/jadwal`, label: t('nav_calendar', 'Calendar'), icon: 'o' },
    { href: `${basePath}/settings`, label: t('nav_settings', 'Settings'), icon: '#' },
  ];

  useEffect(() => {
    let alive = true;
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive) setProfile(data?.user || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadPayout = () => {
      fetch('/api/payouts')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (alive) setPayoutAvailableUsd(Number(data?.summary?.availableUsd || 0));
        })
        .catch(() => {});
    };
    loadPayout();
    window.addEventListener('focus', loadPayout);
    return () => {
      alive = false;
      window.removeEventListener('focus', loadPayout);
    };
  }, [role]);

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    if (item.activePaths?.some((path) => pathname.startsWith(path))) return true;
    return pathname.startsWith(item.href);
  };

  const roleColor = isInternal ? '#0891b2' : '#7c3aed';
  const roleLabel = isInternal ? t('role_internal', 'Staff Internal') : t('role_external', 'Staff External');
  const displayName = profile?.name || (isInternal ? 'Ahmad Fauzi' : 'Budi Santoso');
  const resortName = role === 'External' ? profile?.resort_name || (language === 'en' ? 'Resort not set' : 'Resort belum diset') : null;
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div
        className={`sidebar${isOpen ? ' open' : ''}`}
        style={{
          '--accent': roleColor,
          '--accent-muted': `rgba(${isInternal ? '8,145,178' : '124,58,237'},0.1)`,
        }}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">*</div>
          <div>
            <div className="sidebar-brand-text">Ephemeris</div>
            <div className="sidebar-brand-sub">Stargazing Resort</div>
          </div>
        </div>

        <div
          style={{
            margin: '0 16px 4px',
            padding: '6px 12px',
            background: `rgba(${isInternal ? '8,145,178' : '124,58,237'},0.1)`,
            border: `1px solid rgba(${isInternal ? '8,145,178' : '124,58,237'},0.2)`,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ width: 6, height: 6, background: roleColor }} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: roleColor }}>
            {roleLabel}
          </span>
        </div>

        {resortName && (
          <div
            style={{
              margin: '8px 16px 4px',
              padding: '10px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
              {t('resort_profile', 'Resort Profile')}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25 }}>
              {resortName}
            </div>
            {profile?.resort_code && (
              <div style={{ fontSize: 10, color: roleColor, fontWeight: 800, marginTop: 4 }}>
                {profile.resort_code}
              </div>
            )}
          </div>
        )}

        <nav className="sidebar-nav" style={{ marginTop: 8 }}>
          <div className="sidebar-section-label">{t('nav_main_section', 'Navigasi Utama')}</div>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const showCount = !item.badge && item.href.endsWith('/bookings') && bookingCount > 0;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div className={`sidebar-item ${active ? 'active' : ''}`}>
                  <span style={{ fontSize: 14, lineHeight: 1, width: 16, textAlign: 'center', flexShrink: 0, opacity: active ? 1 : 0.5 }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && <span className="sidebar-count" style={{ background: roleColor, color: 'white', padding: '1px 6px', fontWeight: 800 }}>{item.badge}</span>}
                  {showCount && <span className="sidebar-count" style={{ background: roleColor }}>{bookingCount}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Language Toggle in Sidebar */}
        <div style={{ padding: '0 16px', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: 2 }}>
            <button
              type="button"
              onClick={() => setLanguage('id')}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 10,
                fontWeight: 700,
                background: language === 'id' ? roleColor : 'transparent',
                color: language === 'id' ? 'white' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🇮🇩 ID
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 10,
                fontWeight: 700,
                background: language === 'en' ? roleColor : 'transparent',
                color: language === 'en' ? 'white' : 'var(--text-dim)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-section-label" style={{ padding: '0 0 10px' }}>
            {t('nav_active_locations', 'Lokasi Aktif')}
          </div>
          <div className="sidebar-stations">
            {STATION_DATA.slice(0, 4).map((s, i) => (
              <div key={i} className="sidebar-station">
                <span className={`station-dot ${s.status}`} />
                <span style={{ flex: 1, fontSize: 11 }}>{s.name.replace(/^(Obs\.|ESO |SAAO,) ?/, '')}</span>
                <span style={{ fontSize: 10, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>{s.seeing}</span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                background: roleColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                color: 'white',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {resortName || roleLabel}
              </div>
            </div>
            <button onClick={handleLogout} title={t('nav_logout', 'Keluar')} style={{ color: 'var(--text-dim)', fontSize: 14, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
              x
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
