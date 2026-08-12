'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const PAGE_META = {
  '/dashboard/admin': { title: 'Overview', crumb: 'Dasbor' },
  '/dashboard/admin/bookings': { title: 'Daftar Booking', crumb: 'Booking · Observasi' },
  '/dashboard/admin/keuangan': { title: 'Laporan Keuangan', crumb: 'Keuangan' },
  '/dashboard/admin/payouts': { title: 'Payout Request', crumb: 'Keuangan' },
  '/dashboard/admin/packages': { title: 'Packages', crumb: 'Package & Harga' },
  '/dashboard/admin/pengguna': { title: 'Manajemen Pengguna', crumb: 'Pengguna' },
  '/dashboard/admin/audit': { title: 'Audit Log', crumb: 'Keamanan' },
  '/dashboard/admin/jadwal': { title: 'Jadwal Observasi', crumb: 'Penjadwalan' },
  '/dashboard/admin/sky-events': { title: 'Sky Guide', crumb: 'PWA & Kalender Langit' },
  '/dashboard/admin/alerts': { title: 'Peringatan', crumb: 'Monitoring' },
  '/dashboard/admin/pengaturan': { title: 'Pengaturan', crumb: 'Sistem' },
};

function Clock() {
  const [time, setTime] = useState({ wib: '', utc: '', date: '' });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const utcNow = new Date(now.getTime());
      setTime({
        wib: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        utc: utcNow.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
        date: now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    };
    const first = setTimeout(update, 0);
    const t = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="header-clock">
      <div className="clock-item">
        <div className="clock-label">WIB</div>
        <div className="clock-value">{time.wib}</div>
      </div>
      <div className="clock-item">
        <div className="clock-label">UTC</div>
        <div className="clock-value">{time.utc}</div>
      </div>
      <div className="clock-item">
        <div className="clock-label">Tanggal</div>
        <div className="clock-value" style={{ fontSize: '13px', fontWeight: 600 }}>{time.date}</div>
      </div>
    </div>
  );
}

export default function AdminHeader({ onNewBooking }) {
  const pathname = usePathname();
  const meta = PAGE_META[pathname] || { title: 'Dashboard', crumb: 'Admin' };
  const showNewBooking = pathname === '/dashboard/admin' || pathname === '/dashboard/admin/bookings';

  return (
    <div className="header">
      <div>
        <div className="header-breadcrumb">Admin · {meta.crumb}</div>
        <div className="header-title">{meta.title}</div>
      </div>

      <Clock />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showNewBooking && (
          <button className="btn btn-primary btn-sm" onClick={onNewBooking}>
            + Booking Baru
          </button>
        )}
        <Link href="/dashboard/admin/alerts">
          <button className="btn-icon" title="Peringatan" style={{ border: '1px solid var(--border)' }}>
            ⚡
          </button>
        </Link>
        <div style={{
          width: '36px', height: '36px',
          background: '#e51c1c',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: 'white', cursor: 'pointer',
          flexShrink: 0,
        }} title="Dr. Rina Wijayanti — Admin">
          RW
        </div>
      </div>
    </div>
  );
}
