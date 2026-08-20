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
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const basePath = `/dashboard/${role.toLowerCase()}`;
  const isInternal = role === 'Internal';

  // Load saved pin preference for desktop (defaults to false / collapsed icon rail)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ephemeris_staff_sidebar_pinned');
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
        localStorage.setItem('ephemeris_staff_sidebar_pinned', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Auto-close sidebar on route change (mobile only)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      if (onClose) onClose();
    }
  }, [pathname, onClose]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // tetap lanjut ke halaman login walau API logout gagal
    }
    router.push('/login');
  };

  const isExpanded = isPinned || isHovered;
  const isCollapsed = !isExpanded;

  const NAV_ITEMS = [
    {
      href: basePath,
      label: t('nav_dashboard', 'Dashboard'),
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
      href: `${basePath}/bookings`,
      label: t('nav_bookings', 'Daftar Booking'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <path d="M9 12h6" />
          <path d="M9 16h6" />
        </svg>
      ),
    },
    {
      href: `${basePath}/package`,
      label: t('nav_package', 'Package'),
      activePaths: [`${basePath}/observations`],
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      href: `${basePath}/payout`,
      label: t('nav_payout', 'Payout'),
      badge: payoutAvailableUsd > 0 ? `$${Math.floor(payoutAvailableUsd)}` : '',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="15" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
          <path d="M12 14v3" />
          <path d="M10 15.5h4" />
        </svg>
      ),
    },
    {
      href: `${basePath}/jadwal`,
      label: t('nav_calendar', 'Calendar'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      href: `${basePath}/settings`,
      label: t('nav_settings', 'Settings'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
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
        className={`sidebar${isOpen ? ' open' : ''}${isExpanded ? ' expanded' : ' collapsed'}${isHovered ? ' is-hovered' : ''}${isPinned ? ' pinned' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          '--accent': roleColor,
          '--accent-muted': `rgba(${isInternal ? '8,145,178' : '124,58,237'},0.12)`,
          '--accent-glow': `rgba(${isInternal ? '8,145,178' : '124,58,237'},0.25)`,
        }}
      >
        {/* Top Hamburger bar in sidebar (Desktop pin toggle & Mobile close button) */}
        <div className="sidebar-top-bar">
          <button
            type="button"
            className={`sidebar-hamburger-btn desktop-only${isPinned ? ' pinned' : ''}`}
            onClick={togglePin}
            title={isPinned ? t('unpin_sidebar', 'Lepas Kunci Sidebar (Mode Hover)') : t('pin_sidebar', 'Kunci / Buka Penuh Sidebar')}
            aria-label={t('accessibility_toggle_sidebar')}
          >
            <span className="sidebar-hamburger-line" />
            <span className="sidebar-hamburger-line" />
            <span className="sidebar-hamburger-line" />
          </button>
          <button
            type="button"
            className="sidebar-close-btn mobile-only"
            onClick={onClose}
            title={t('accessibility_close_menu')}
            aria-label={t('accessibility_close_menu')}
          >
            ✕
          </button>
        </div>

        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon" title="Ephemeris Stargazing Resort">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="3" fill="white" />
              <line x1="12" y1="1" x2="12" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="12" x2="5" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="19" y1="12" x2="23" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="sidebar-collapsible-text">
            <div className="sidebar-brand-text">Ephemeris</div>
            <div className="sidebar-brand-sub">Stargazing Resort</div>
          </div>
        </div>

        {/* Role Badge */}
        <div
          className="sidebar-role-badge"
          style={{
            background: `rgba(${isInternal ? '8,145,178' : '124,58,237'},0.12)`,
            border: `1px solid rgba(${isInternal ? '8,145,178' : '124,58,237'},0.25)`,
          }}
          title={roleLabel}
        >
          <div className="sidebar-role-indicator">
            <div style={{ width: 8, height: 8, background: roleColor }} />
          </div>
          <span
            className="sidebar-collapsible-text"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: roleColor }}
          >
            {roleLabel}
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            const showCount = !item.badge && item.href.endsWith('/bookings') && bookingCount > 0;
            return (
              <Link key={item.href} href={item.href} className="sidebar-item-link">
                <div className={`sidebar-item ${active ? 'active' : ''}`}>
                  <span className="sidebar-item-icon">{item.icon}</span>
                  <span className="sidebar-collapsible-text">{item.label}</span>
                  {item.badge && (
                    <span className="sidebar-badge" style={{ background: roleColor, color: 'white' }}>
                      {item.badge}
                    </span>
                  )}
                  {showCount && (
                    <span className="sidebar-count" style={{ background: roleColor, color: 'white', padding: '1px 6px' }}>
                      {bookingCount}
                    </span>
                  )}
                  {isCollapsed && <div className="sidebar-tooltip">{item.label}</div>}
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
              aria-label={t('accessibility_toggle_language')}
            >
              <span className="sidebar-lang-compact-badge" style={{ background: roleColor, color: 'white' }}>
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
                  background: language === 'id' ? roleColor : 'transparent',
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
                  background: language === 'en' ? roleColor : 'transparent',
                  color: language === 'en' ? 'white' : 'var(--text-dim)',
                }}
                title="English"
              >
                🇬🇧 EN
              </button>
            </div>
          )}
        </div>

        {/* Footer / Stations & User */}
        <div className="sidebar-footer">
          <div className="sidebar-collapsible-text sidebar-section-label" style={{ padding: '0 0 8px' }}>
            {t('nav_active_locations', 'Lokasi Aktif')}
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
              style={{ background: roleColor }}
              onClick={isCollapsed ? handleLogout : undefined}
              title={isCollapsed ? `${displayName} (${roleLabel}) - ${t('nav_logout', 'Keluar')}` : displayName}
            >
              {initials}
              {isCollapsed && (
                <div className="sidebar-tooltip">
                  <strong>{displayName}</strong>
                  <div>{roleLabel}</div>
                </div>
              )}
            </div>
            <div className="sidebar-collapsible-text" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {resortName || roleLabel}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-collapsible-text"
              title={t('nav_logout', 'Keluar')}
              style={{ color: 'var(--text-dim)', fontSize: 14, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}
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
