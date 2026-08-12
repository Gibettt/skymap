'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getObservationBySlug } from '@/data/observations';

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

export default function StaffHeader({ role = 'Internal', onNewBooking }) {
  const pathname = usePathname();
  
  const getPageInfo = () => {
    if (pathname.includes('/observations/')) {
      const slug = pathname.split('/observations/')[1];
      const exp = getObservationBySlug(slug);
      return { title: exp?.title ?? 'Package', crumb: 'Package' };
    }
    if (pathname.endsWith('/bookings')) return { title: role === 'External' ? 'My Bookings' : 'All Bookings', crumb: 'Reservasi' };
    if (pathname.endsWith('/payout')) return { title: 'Payout', crumb: 'Komisi' };
    if (pathname.endsWith('/jadwal')) return { title: 'Calendar', crumb: 'Penjadwalan' };
    if (pathname.endsWith('/instruments')) return { title: 'Instruments', crumb: 'Instruments' };
    if (pathname.endsWith('/users')) return { title: 'Users', crumb: 'Users' };
    if (pathname.endsWith('/reports')) return { title: 'Reports', crumb: 'Reports' };
    if (pathname.endsWith('/settings')) return { title: 'Settings', crumb: 'Settings' };
    return { title: 'Overview', crumb: 'Dasbor' };
  };

  const meta = getPageInfo();
  const showNewBooking = pathname.endsWith('/bookings') || pathname === `/dashboard/${role.toLowerCase()}`;
  const roleColor = role === 'Internal' ? '#0891b2' : '#7c3aed';

  return (
    <div className="header">
      <div>
        <div className="header-breadcrumb">{role} · {meta.crumb}</div>
        <div className="header-title">{meta.title}</div>
      </div>

      <Clock />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showNewBooking && (
          <button className="btn btn-sm" style={{ background: roleColor, color: 'white', border: 'none', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }} onClick={onNewBooking}>
            + Booking Baru
          </button>
        )}
        <div style={{
          width: '36px', height: '36px', background: roleColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: 'white', cursor: 'pointer', flexShrink: 0,
        }} title={`${role === 'Internal' ? 'Ahmad Fauzi' : 'Budi Santoso'} — ${role}`}>
          {role === 'Internal' ? 'AF' : 'BS'}
        </div>
      </div>
    </div>
  );
}
