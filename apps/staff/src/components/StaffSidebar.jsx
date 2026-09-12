'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronsUpDown,
  CircleDollarSign,
  ClipboardList,
  DoorOpen,
  Grid2X2,
  PackageOpen,
  Settings,
  Sparkles,
  SquarePen,
  X,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function StaffSidebar({ role = 'Internal', bookingCount = 0, isOpen = false, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [payoutAvailableUsd, setPayoutAvailableUsd] = useState(0);
  const basePath = `/dashboard/${role.toLowerCase()}`;
  const isInternal = role === 'Internal';

  useEffect(() => {
    if (window.innerWidth <= 768) onClose?.();
  }, [pathname, onClose]);

  useEffect(() => {
    let alive = true;
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (alive) setProfile(data?.user || null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadPayout = () => {
      fetch('/api/payouts')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (alive) setPayoutAvailableUsd(Number(data?.summary?.availableUsd || 0)); })
        .catch(() => {});
    };
    loadPayout();
    window.addEventListener('focus', loadPayout);
    return () => {
      alive = false;
      window.removeEventListener('focus', loadPayout);
    };
  }, [role]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Tetap kembali ke login jika endpoint logout sedang tidak tersedia.
    }
    router.push('/login');
  };

  const navItems = [
    { href: basePath, label: t('nav_dashboard', 'Dashboard'), exact: true, icon: Grid2X2 },
    { href: `${basePath}/bookings`, label: t('nav_bookings', 'Daftar Booking'), icon: ClipboardList },
    {
      href: `${basePath}/package`,
      label: t('nav_package', 'Package'),
      activePaths: [`${basePath}/observations`],
      icon: PackageOpen,
    },
    {
      href: `${basePath}/payout`,
      label: t('nav_payout', 'Payout'),
      badge: payoutAvailableUsd > 0 ? `$${Math.floor(payoutAvailableUsd)}` : '',
      icon: CircleDollarSign,
    },
    { href: `${basePath}/jadwal`, label: t('nav_calendar', 'Calendar'), icon: CalendarDays },
    ...(isInternal ? [{ href: `${basePath}/sky-events`, label: t('nav_sky_guide', 'Sky Guide'), icon: Sparkles }] : []),
    { href: `${basePath}/settings`, label: t('nav_settings', 'Settings'), icon: Settings },
  ];

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    if (item.activePaths?.some((path) => pathname.startsWith(path))) return true;
    return pathname.startsWith(item.href);
  };

  const roleLabel = isInternal ? t('role_internal', 'Staff Internal') : t('role_external', 'Staff External');
  const displayName = profile?.name || (isInternal ? 'Ahmad Fauzi' : 'Budi Santoso');
  const resortName = role === 'External'
    ? profile?.resort_name || (language === 'en' ? 'Resort not set' : 'Resort belum diset')
    : null;
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const workspaceItems = navItems.slice(0, -1);
  const accountItems = navItems.slice(-1);

  const renderNavItem = (item) => {
    const Icon = item.icon;
    const showCount = !item.badge && item.href.endsWith('/bookings') && bookingCount > 0;
    return (
      <Link key={item.href} href={item.href} className={`sidebar-item-link${isActive(item) ? ' active' : ''}`}>
        <span className="sidebar-item-icon"><Icon aria-hidden="true" /></span>
        <span className="sidebar-item-label">{item.label}</span>
        {item.badge && <span className="sidebar-badge">{item.badge}</span>}
        {showCount && <span className="sidebar-count">{bookingCount}</span>}
      </Link>
    );
  };

  return (
    <>
      {isOpen && <button type="button" className="sidebar-overlay" onClick={onClose} aria-label={t('accessibility_close_menu')} />}
      <aside className={`sidebar${isOpen ? ' open' : ''}`}>
        <div className="sidebar-workspace">
          <div className="sidebar-brand-icon" title="SpaceCat ASTROTOURISM">
            <Image src="/spacecat-astrotourism-logo.jpg" alt="" width={24} height={24} sizes="24px" />
          </div>
          <div className="sidebar-brand-copy"><div className="sidebar-brand-text">SpaceCat ASTROTOURISM</div></div>
          <ChevronsUpDown className="sidebar-workspace-chevron" aria-hidden="true" />
          <Link href={`${basePath}/form-booking`} className="sidebar-create-booking" title={t('btn_new_booking', 'Booking Baru')} aria-label={t('btn_new_booking', 'Booking Baru')}>
            <SquarePen aria-hidden="true" />
          </Link>
          <button type="button" className="sidebar-close-btn mobile-only" onClick={onClose} aria-label={t('accessibility_close_menu')}>
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="sidebar-team" title={roleLabel}>
          <div className="sidebar-team-mark">{isInternal ? 'IN' : 'EX'}</div>
          <div className="sidebar-team-copy">
            <strong>{roleLabel}</strong>
            <span>{isInternal ? 'Operations workspace' : (resortName || 'Partner workspace')}</span>
          </div>
          <span className="sidebar-team-status" aria-hidden="true" />
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav" aria-label="Workspace">{workspaceItems.map(renderNavItem)}</nav>

        <div className="sidebar-section-label sidebar-account-label">Account</div>
        <nav className="sidebar-nav sidebar-account-nav" aria-label="Account">{accountItems.map(renderNavItem)}</nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-box">
            <div className="sidebar-avatar-wrap">{initials}</div>
            <div className="sidebar-user-copy">
              <strong>{displayName}</strong>
              <span>{resortName || roleLabel}</span>
            </div>
            <button onClick={handleLogout} className="sidebar-logout" title={t('nav_logout', 'Keluar')} aria-label={t('nav_logout', 'Keluar')}>
              <DoorOpen aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
