'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { STATION_DATA } from '@/data/stations';
import { OBSERVATION_EXPERIENCES } from '@/data/observations';

export default function StaffSidebar({ role = 'Internal', bookingCount = 0 }) {
  const pathname = usePathname();
  const basePath = `/dashboard/${role.toLowerCase()}`;

  const NAV_ITEMS = role === 'External' ? [
    { href: basePath, label: 'Dashboard', icon: '*', exact: true },
    {
      label: 'Observations',
      icon: '+',
      children: OBSERVATION_EXPERIENCES.map((exp) => ({
        href: `${basePath}/observations/${exp.slug}`,
        label: exp.title,
        icon: exp.icon,
      })),
    },
    { href: `${basePath}/bookings`, label: 'My Bookings', icon: '=' },
    { href: `${basePath}/jadwal`, label: 'Calendar', icon: 'o' },
    { href: `${basePath}/settings`, label: 'Settings', icon: '#' },
  ] : [
    { href: basePath, label: 'Overview', icon: '*', exact: true },
    { href: `${basePath}/bookings`, label: 'Booking Saya', icon: '=' },
    { href: `${basePath}/jadwal`, label: 'Jadwal Observasi', icon: 'o' },
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
          const showCount = item.href.endsWith('/bookings') && bookingCount > 0;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div className={`sidebar-item ${active ? 'active' : ''}`}>
                <span style={{ fontSize: 14, lineHeight: 1, width: 16, textAlign: 'center', flexShrink: 0, opacity: active ? 1 : 0.5 }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
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
            {role === 'Internal' ? 'AF' : 'BS'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {role === 'Internal' ? 'Ahmad Fauzi' : 'Budi Santoso'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {roleLabel}
            </div>
          </div>
          <Link href="/" title="Keluar" style={{ color: 'var(--text-dim)', fontSize: 14, flexShrink: 0 }}>x</Link>
        </div>
      </div>
    </div>
  );
}
