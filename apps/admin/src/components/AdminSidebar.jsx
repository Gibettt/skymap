'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { STATION_DATA } from '@/data/stations';
import { useAdminLanguage } from '@/context/AdminLanguageContext';

const NAV_ITEMS = [
  {
    href: '/dashboard/admin',
    label: 'Overview',
    exact: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/bookings',
    label: 'Daftar Booking',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <line x1="9" y1="12" x2="15" y2="12" />
        <line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/resorts',
    label: 'Resort Mitra',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <line x1="9" y1="9" x2="9" y2="9.01" />
        <line x1="9" y1="13" x2="9" y2="13.01" />
        <line x1="9" y1="17" x2="9" y2="17.01" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/keuangan',
    label: 'Keuangan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <circle cx="16" cy="15" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/packages',
    label: 'Packages',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/pengguna',
    label: 'Pengguna',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/audit',
    label: 'Audit Log',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/jadwal',
    label: 'Kalender',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="0" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/sky-events',
    label: 'Sky Guide',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/alerts',
    label: 'Peringatan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    href: '/dashboard/admin/pengaturan',
    label: 'Pengaturan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

const NAV_LABEL_KEYS = {
  '/dashboard/admin': 'nav_overview',
  '/dashboard/admin/bookings': 'nav_bookings',
  '/dashboard/admin/resorts': 'nav_resorts',
  '/dashboard/admin/keuangan': 'nav_finance',
  '/dashboard/admin/packages': 'nav_packages',
  '/dashboard/admin/pengguna': 'nav_users',
  '/dashboard/admin/audit': 'nav_audit',
  '/dashboard/admin/jadwal': 'nav_calendar',
  '/dashboard/admin/sky-events': 'nav_sky_guide',
  '/dashboard/admin/alerts': 'nav_alerts',
  '/dashboard/admin/pengaturan': 'nav_settings',
};

export default function AdminSidebar({ alertCount = 0, bookingCount = 0, isOpen = false, onClose }) {
  const { language, setLanguage, t } = useAdminLanguage();
  const pathname = usePathname();
  const router = useRouter();

  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Load saved pin preference for desktop
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ephemeris_admin_sidebar_pinned');
      if (saved !== null) {
        setIsPinned(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const togglePin = (e) => {
    e?.stopPropagation();
    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ephemeris_admin_sidebar_pinned', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // tetap lanjut ke halaman login walau API logout gagal
    }
    router.push('/login');
  };

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  // Auto-close sidebar on route change (mobile only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      if (onClose) onClose();
    }
  }, [pathname, onClose]);

  const isExpanded = isPinned || isHovered;
  const isCollapsed = !isExpanded;

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <div
        className={`sidebar${isOpen ? ' open' : ''}${isExpanded ? ' expanded' : ' collapsed'}${isHovered ? ' is-hovered' : ''}${isPinned ? ' pinned' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Hamburger bar in sidebar (Desktop pin toggle & Mobile close button) */}
        <div className="sidebar-top-bar">
          <button
            type="button"
            className={`sidebar-hamburger-btn desktop-only${isPinned ? ' pinned' : ''}`}
            onClick={togglePin}
            title={isPinned ? t('unpin_sidebar', 'Lepas Kunci Sidebar (Mode Hover)') : t('pin_sidebar', 'Kunci / Buka Penuh Sidebar')}
            aria-label="Toggle sidebar"
          >
            <span className="sidebar-hamburger-line" />
            <span className="sidebar-hamburger-line" />
            <span className="sidebar-hamburger-line" />
          </button>
          <button
            type="button"
            className="sidebar-close-btn mobile-only"
            onClick={onClose}
            title="Tutup Menu"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" title="Ephemeris Observatorium Nasional">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="white" />
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" fill="none" />
              <line x1="12" y1="3" x2="12" y2="0.5" stroke="white" strokeWidth="1.5" />
              <line x1="12" y1="21" x2="12" y2="23.5" stroke="white" strokeWidth="1.5" />
              <line x1="3" y1="12" x2="0.5" y2="12" stroke="white" strokeWidth="1.5" />
              <line x1="21" y1="12" x2="23.5" y2="12" stroke="white" strokeWidth="1.5" />
            </svg>
          </div>
          <div className="sidebar-collapsible-text">
            <div className="sidebar-brand-text">Ephemeris</div>
            <div className="sidebar-brand-sub">{t('observatory_name', 'Observatorium Nasional')}</div>
          </div>
        </div>

        {/* Role Badge */}
        <div className="sidebar-role-badge" title="Administrator">
          <div className="sidebar-role-indicator">
            <div style={{ width: 8, height: 8, background: 'var(--accent)', animation: 'pulseRed 2s infinite' }} />
          </div>
          <span
            className="sidebar-collapsible-text"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)' }}
          >
            Admin
          </span>
        </div>

        {/* Nav items */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const showBadge = item.href.includes('alerts') && alertCount > 0;
            const showCount = item.href.includes('bookings') && bookingCount > 0;
            const itemLabel = t(NAV_LABEL_KEYS[item.href], item.label);

            return (
              <Link key={item.href} href={item.href} className="sidebar-item-link">
                <div className={`sidebar-item ${active ? 'active' : ''}`}>
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span className="sidebar-collapsible-text">{itemLabel}</span>
                  {showBadge && (
                    <span className="sidebar-badge">{alertCount}</span>
                  )}
                  {showCount && (
                    <span className="sidebar-count">{bookingCount}</span>
                  )}
                  {isCollapsed && <div className="sidebar-tooltip">{itemLabel}</div>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Language Toggle in Sidebar */}
        <div className="sidebar-lang-box">
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
              className="sidebar-lang-compact-btn"
              title={language === 'id' ? 'Ganti ke English (EN)' : 'Ganti ke Bahasa Indonesia (ID)'}
              aria-label="Toggle language"
            >
              <span className="sidebar-lang-compact-badge" style={{ background: 'var(--accent)', color: 'white' }}>
                {language === 'id' ? 'ID' : 'EN'}
              </span>
              <div className="sidebar-tooltip">
                {language === 'id' ? 'Bahasa: ID (Klik untuk EN)' : 'Language: EN (Click for ID)'}
              </div>
            </button>
          ) : (
            <div className="sidebar-lang-inner">
              <button
                type="button"
                onClick={() => setLanguage('id')}
                className={`sidebar-lang-btn ${language === 'id' ? 'active' : ''}`}
                style={{
                  background: language === 'id' ? 'var(--accent)' : 'transparent',
                  color: language === 'id' ? 'white' : 'var(--text-dim)',
                }}
                title="Bahasa Indonesia"
              >
                🇮🇩 ID
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`sidebar-lang-btn ${language === 'en' ? 'active' : ''}`}
                style={{
                  background: language === 'en' ? 'var(--accent)' : 'transparent',
                  color: language === 'en' ? 'white' : 'var(--text-dim)',
                }}
                title="English"
              >
                🇬🇧 EN
              </button>
            </div>
          )}
        </div>

        {/* Station Status & User */}
        <div className="sidebar-footer">
          <div className="sidebar-collapsible-text sidebar-section-label" style={{ padding: '0 0 8px' }}>
            {t('active_stations', 'Stasiun Aktif')}
          </div>
          <div className="sidebar-stations">
            {STATION_DATA.slice(0, 4).map((s, i) => (
              <div key={i} className="sidebar-station" title={`${s.name} (${s.status}) - Seeing: ${s.seeing}`}>
                <span className={`station-dot ${s.status}`} />
                <span className="sidebar-collapsible-text" style={{ flex: 1, fontSize: 11 }}>
                  {s.name.replace(/^(Obs\.|ESO |SAAO,) ?/, '')}
                </span>
                <span className="sidebar-collapsible-text" style={{ fontSize: 10, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                  {s.seeing}
                </span>
              </div>
            ))}
          </div>

          <div className="sidebar-user-box">
            <div
              className="sidebar-avatar-wrap"
              style={{ background: 'var(--accent)' }}
              onClick={isCollapsed ? handleLogout : undefined}
              title={isCollapsed ? `Dr. Rina Wijayanti (Administrator) - ${t('logout', 'Keluar')}` : 'Dr. Rina Wijayanti'}
            >
              RW
              {isCollapsed && (
                <div className="sidebar-tooltip">
                  <strong>Dr. Rina Wijayanti</strong>
                  <div>Administrator</div>
                </div>
              )}
            </div>
            <div className="sidebar-collapsible-text" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Dr. Rina Wijayanti
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Administrator
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-collapsible-text"
              title={t('logout', 'Keluar')}
              style={{ color: 'var(--text-dim)', fontSize: 14, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
