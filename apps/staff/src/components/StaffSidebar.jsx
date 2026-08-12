'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { STATION_DATA } from '@/data/stations';
import { getPackageNavItems } from '@/data/observations';

export default function StaffSidebar({ role = 'Internal', bookingCount = 0 }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [packageRows, setPackageRows] = useState([]);
  const [payoutAvailableUsd, setPayoutAvailableUsd] = useState(0);
  const basePath = `/dashboard/${role.toLowerCase()}`;
  const packageNavItems = getPackageNavItems(packageRows);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // tetap lanjut ke halaman login walau API logout gagal
    }
    router.push('/login');
  };

  const NAV_ITEMS = [
    { href: basePath, label: 'Dashboard', icon: '*', exact: true },
    {
      label: 'Package',
      icon: '+',
      children: packageNavItems.map((pkg) => ({
        href: `${basePath}/observations/${pkg.slug}`,
        label: pkg.title,
        icon: pkg.icon,
      })),
    },
    { href: `${basePath}/bookings`, label: role === 'External' ? 'Resort Bookings' : 'All Bookings', icon: '=' },
    ...(role === 'External' ? [
      { href: `${basePath}/payout`, label: 'Payout', icon: '$', badge: payoutAvailableUsd > 0 ? `$${Math.floor(payoutAvailableUsd)}` : '' },
    ] : []),
    { href: `${basePath}/jadwal`, label: 'Calendar', icon: 'o' },
    ...(role === 'External' ? [
      { href: `${basePath}/settings`, label: 'Settings', icon: '#' },
    ] : []),
  ];

  const groupHasActiveChild = (item) => item.children?.some((child) => pathname.startsWith(child.href));

  const [openGroups, setOpenGroups] = useState(() => new Set(
    NAV_ITEMS.filter((item) => item.children && groupHasActiveChild(item)).map((item) => item.label)
  ));

  useEffect(() => {
    const timer = setTimeout(() => {
      NAV_ITEMS.forEach((item) => {
        if (item.children && groupHasActiveChild(item)) {
          setOpenGroups((prev) => (prev.has(item.label) ? prev : new Set(prev).add(item.label)));
        }
      });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    fetch('/api/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (alive) setProfile(data?.user || null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (role !== 'External') return undefined;

    let alive = true;
    const loadPayout = () => {
      fetch('/api/payouts')
        .then((res) => res.ok ? res.json() : null)
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

  useEffect(() => {
    let alive = true;
    const loadPackages = () => {
      fetch('/api/packages')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (alive) setPackageRows(data?.packages || []);
        })
        .catch(() => {});
    };
    loadPackages();
    window.addEventListener('focus', loadPackages);
    return () => {
      alive = false;
      window.removeEventListener('focus', loadPackages);
    };
  }, []);

  const toggleGroup = (label) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  const roleColor = role === 'Internal' ? '#0891b2' : '#7c3aed';
  const roleLabel = role === 'Internal' ? 'Staff Internal' : 'Staff External';
  const displayName = profile?.name || (role === 'Internal' ? 'Ahmad Fauzi' : 'Budi Santoso');
  const resortName = role === 'External' ? (profile?.resort_name || 'Resort belum diset') : null;
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="sidebar" style={{
      '--accent': roleColor,
      '--accent-muted': `rgba(${role === 'Internal' ? '8,145,178' : '124,58,237'},0.1)`,
    }}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">*</div>
        <div>
          <div className="sidebar-brand-text">Ephemeris</div>
          <div className="sidebar-brand-sub">Stargazing Resort</div>
        </div>
      </div>

      <div style={{
        margin: '0 16px 4px',
        padding: '6px 12px',
        background: `rgba(${role === 'Internal' ? '8,145,178' : '124,58,237'},0.1)`,
        border: `1px solid rgba(${role === 'Internal' ? '8,145,178' : '124,58,237'},0.2)`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ width: 6, height: 6, background: roleColor }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: roleColor }}>
          {roleLabel}
        </span>
      </div>
      {resortName && (
        <div style={{
          margin: '8px 16px 4px',
          padding: '10px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4 }}>
            Resort Profile
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
        <div className="sidebar-section-label">Navigasi Utama</div>
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            const open = openGroups.has(item.label);
            const groupActive = groupHasActiveChild(item);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  className={`sidebar-group-toggle ${groupActive ? 'active' : ''}`}
                  onClick={() => toggleGroup(item.label)}
                >
                  <span style={{ fontSize: 14, lineHeight: 1, width: 16, textAlign: 'center', flexShrink: 0, opacity: groupActive ? 1 : 0.5 }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  <span className={`sidebar-chevron ${open ? 'open' : ''}`}>{'>'}</span>
                </button>
                {open && (
                  <div className="sidebar-children">
                    {item.children.map((child) => {
                      const childActive = pathname.startsWith(child.href);
                      return (
                        <Link key={child.href} href={child.href} style={{ textDecoration: 'none' }}>
                          <div className={`sidebar-item ${childActive ? 'active' : ''}`}>
                            <span style={{ fontSize: 13, lineHeight: 1, width: 16, textAlign: 'center', flexShrink: 0, opacity: childActive ? 1 : 0.5 }}>
                              {child.icon}
                            </span>
                            <span>{child.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

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

      <div className="sidebar-footer">
        <div className="sidebar-section-label" style={{ padding: '0 0 10px' }}>
          Lokasi Aktif
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

        <div style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
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
          }}>
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
          <button onClick={handleLogout} title="Keluar" style={{ color: 'var(--text-dim)', fontSize: 14, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>x</button>
        </div>
      </div>
    </div>
  );
}
