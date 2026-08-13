'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { STATION_DATA } from '@/data/stations';

const NAV_ITEMS = [
  { href: '/dashboard/admin', label: 'Overview', icon: '◉', exact: true },
  { href: '/dashboard/admin/bookings', label: 'Daftar Booking', icon: '≡' },
  { href: '/dashboard/admin/keuangan', label: 'Keuangan', icon: '₽' },
  { href: '/dashboard/admin/packages', label: 'Packages', icon: '$' },
  { href: '/dashboard/admin/pengguna', label: 'Pengguna', icon: '⊕' },
  { href: '/dashboard/admin/audit', label: 'Audit Log', icon: '!' },
  { href: '/dashboard/admin/jadwal', label: 'Kalender', icon: '◷' },
  { href: '/dashboard/admin/sky-events', label: 'Sky Guide', icon: '★' },
  { href: '/dashboard/admin/alerts', label: 'Peringatan', icon: '⚡' },
  { href: '/dashboard/admin/pengaturan', label: 'Pengaturan', icon: '⊞' },
];

export default function AdminSidebar({ alertCount = 0, bookingCount = 0 }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {
      // tetap lanjut ke halaman login walau API logout gagal
    }
    router.push('/login');
  };

  const isActive = (item) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <div className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="4" fill="white" />
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5" fill="none" />
            <line x1="12" y1="3" x2="12" y2="0.5" stroke="white" strokeWidth="1.5" />
            <line x1="12" y1="21" x2="12" y2="23.5" stroke="white" strokeWidth="1.5" />
            <line x1="3" y1="12" x2="0.5" y2="12" stroke="white" strokeWidth="1.5" />
            <line x1="21" y1="12" x2="23.5" y2="12" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <div className="sidebar-brand-text">Ephemeris</div>
          <div className="sidebar-brand-sub">Observatorium Nasional</div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{
        margin: '0 16px 4px',
        padding: '6px 12px',
        background: 'rgba(229,28,28,0.08)',
        border: '1px solid rgba(229,28,28,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{ width: '6px', height: '6px', background: '#e51c1c', animation: 'pulseRed 2s infinite' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#e51c1c' }}>
          Admin
        </span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav" style={{ marginTop: '8px' }}>
        <div className="sidebar-section-label">Navigasi</div>
        {NAV_ITEMS.map(item => {
          const active = isActive(item);
          const showBadge = item.href.includes('alerts') && alertCount > 0;
          const showCount = item.href.includes('bookings') && bookingCount > 0;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div className={`sidebar-item ${active ? 'active' : ''}`}>
                <span style={{
                  fontSize: '14px',
                  lineHeight: 1,
                  width: '16px',
                  textAlign: 'center',
                  flexShrink: 0,
                  opacity: active ? 1 : 0.5,
                }}>{item.icon}</span>
                <span>{item.label}</span>
                {showBadge && (
                  <span className="sidebar-badge">{alertCount}</span>
                )}
                {showCount && (
                  <span className="sidebar-count">{bookingCount}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Station Status */}
      <div className="sidebar-footer">
        <div className="sidebar-section-label" style={{ padding: '0 0 10px' }}>
          Stasiun Aktif
        </div>
        <div className="sidebar-stations">
          {STATION_DATA.map((s, i) => (
            <div key={i} className="sidebar-station">
              <span className={`station-dot ${s.status}`} />
              <span style={{ flex: 1, fontSize: '11px' }}>
                {s.name.replace(/^(Obs\.|ESO |SAAO,) ?/, '')}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                {s.seeing}
              </span>
            </div>
          ))}
        </div>

        {/* User info */}
        <div style={{
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '30px', height: '30px',
            background: '#e51c1c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            RW
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Dr. Rina Wijayanti
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Administrator
            </div>
          </div>
          <button onClick={handleLogout} title="Keluar" style={{ color: 'var(--text-dim)', fontSize: '14px', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}>
            ⏏
          </button>
        </div>
      </div>
    </div>
  );
}
